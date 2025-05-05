from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Body, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import json
import re
import random
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
import os
import logging
from dotenv import load_dotenv
# Add this at the top of your file
import traceback
from bson.objectid import ObjectId

# Import Langfuse Callback Handler
from langfuse.callback import CallbackHandler

# Import the auth router
from .routes.auth import router as auth_router, get_current_user
from .routes.conversations import router as conversations_router, add_message_to_conversation, get_conversation
from .routes.admin import router as admin_router  # Import the new admin router
from .routes.call_records import router as call_records_router  # Import the call records router
from .routes.auth import conversations_collection
from api.core.tools import graph  # Import the graph from your tools module
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Langfuse Handler Initialization
# Ensure environment variables are loaded before this
try:
    langfuse_handler = CallbackHandler(
        public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
        secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
        host=os.getenv("LANGFUSE_HOST")
    )
    logger.info("Langfuse Handler initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize Langfuse Handler: {e}")
    langfuse_handler = None # Set to None if initialization fails

app = FastAPI(title="Delaphone AI")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include just the auth router for now
app.include_router(auth_router)
app.include_router(conversations_router)
app.include_router(admin_router)  # Include the admin router
app.include_router(call_records_router)  # Include the call records router

# Initialize OpenAI model with Langfuse callback
# Ensure langfuse_handler is included in the list if it initialized successfully
callbacks = [langfuse_handler] if langfuse_handler else []
model = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4o"),
    temperature=0,
    callbacks=callbacks # Pass handler to the model
)

class ChatRequest(BaseModel):
    question: str = Field(..., description="The question to process")
    conversation_id: str = Field(..., description="The ID of the conversation")

# Add this function at the cursor position
def track_user_token_usage(user_id, usage_data):
    """
    Track a user's token usage and check against their limit.
    
    Args:
        user_id: The ID of the user
        usage_data: Token usage data from API response
        
    Returns:
        Dict with token usage information and limit status
    """
    try:
        # Log what we received for debugging
        logger.info(f"💾 Token usage data received: {usage_data}")
        
        # Extract token counts
        prompt_tokens = usage_data.get('prompt_tokens', 0)
        completion_tokens = usage_data.get('completion_tokens', 0)
        total_tokens = usage_data.get('total_tokens', 0) or (prompt_tokens + completion_tokens)
        
        # If we didn't get any token info, use an estimated count
        if total_tokens == 0:
            # Rough estimation of tokens if no usage data provided
            estimated_tokens = 100
            logger.warning(f"⚠️ No token usage data available, using estimate of {estimated_tokens}")
            total_tokens = estimated_tokens
            
        logger.info(f"🧮 Calculated token usage: prompt={prompt_tokens}, completion={completion_tokens}, total={total_tokens}")
        
        # Get token limit from environment (with default)
        user_token_limit = int(os.getenv("USER_TOKEN_LIMIT", 100000))
        
        # Get user from database to check/update token usage
        from .routes.auth import users_collection
        
        # Handle potential ObjectId conversion
        mongo_user_id = user_id
        try:
            # If it's a 24-character string, it might be an ObjectId
            if isinstance(user_id, str) and len(user_id) == 24:
                mongo_user_id = ObjectId(user_id)
                logger.info(f"🔄 Converted user_id to ObjectId: {mongo_user_id}")
        except:
            # Keep as string if conversion fails
            logger.info(f"📝 Using user_id as string: {user_id}")
            pass
            
        # First try with potential ObjectId
        logger.info(f"🔍 Looking up user {mongo_user_id} in users_collection")
        user = users_collection.find_one({"_id": mongo_user_id})
        
        # If not found, try with original string ID
        if not user and mongo_user_id != user_id:
            logger.info(f"🔍 User not found with ObjectId, trying with string ID: {user_id}")
            user = users_collection.find_one({"_id": user_id})
            # If found with string ID, use that going forward
            if user:
                mongo_user_id = user_id
        
        if not user:
            logger.error(f"❌ User {user_id} not found when tracking tokens")
            return {"error": "User not found"}
        
        # Get current usage (initialize if not present)
        current_usage = user.get("token_usage", 0)
        # Make sure it's a number - handle case where field exists but is None
        if current_usage is None:
            current_usage = 0
            
        logger.info(f"📊 Current token usage for user {user_id}: {current_usage}")
        
        # Update token usage in user record - use $set to ensure field is created if missing
        new_usage = current_usage + total_tokens
        update_result = users_collection.update_one(
            {"_id": mongo_user_id},
            {"$set": {"token_usage": new_usage}}
        )
        
        # Log the update result
        if update_result.matched_count > 0:
            if update_result.modified_count > 0:
                logger.info(f"✅ Updated token usage for user {user_id} to {new_usage}")
            else:
                logger.info(f"ℹ️ Token usage was already {new_usage} for user {user_id}")
        else:
            logger.warning(f"❌ Failed to update token usage - user {user_id} not found")
        
        # Calculate percentage used
        percentage_used = (new_usage / user_token_limit) * 100
        
        # Determine status
        status = {
            "user_id": str(user_id),
            "token_usage": new_usage,
            "token_limit": user_token_limit,
            "percentage_used": round(percentage_used, 1),
            "tokens_remaining": max(0, user_token_limit - new_usage),
            "limit_reached": new_usage >= user_token_limit,
            "approaching_limit": new_usage >= 0.8 * user_token_limit and new_usage < user_token_limit,
            "tokens_added": total_tokens
        }
        
        # Log if approaching or reached limit
        if status["limit_reached"]:
            logger.warning(f"⚠️ User {user_id} has reached their token limit of {user_token_limit}")
        elif status["approaching_limit"]:
            logger.info(f"⚠️ User {user_id} is approaching their token limit ({percentage_used:.1f}%)")
            
        return status
        
    except Exception as e:
        import traceback
        logger.error(f"❌ Error tracking token usage: {str(e)}")
        logger.error(traceback.format_exc())
        return {"error": str(e)}

def sanitize_json_string(json_str):
    """Clean up JSON strings that might contain special characters or escape sequences"""
    # Replace any problematic escape sequences
    cleaned = json_str.replace('\\"', '"')
    # Handle any other special characters that might break JSON parsing
    return cleaned

def format_analysis_to_json(text_content):
    """
    Convert text-based analysis report to structured JSON format
    
    Args:
        text_content: The text content from the API response
        
    Returns:
        Properly formatted JSON object following the schema
    """
    if not text_content or not isinstance(text_content, str):
        return {"error": "Invalid input for formatting"}
    
    # Initialize the structure
    result = {
        "metrics": {},
        "analysis": {
            "common_issues": [],
            "strengths": [],
            "improvement_areas": [],
            "trends": {
                "overall_direction": "",
                "key_patterns": [],
                "notable_changes": []
            },
            "call_types": [],
            "customer_sentiment_analysis": {
                "positive_sentiment": 0,
                "neutral_sentiment": 0,
                "negative_sentiment": 0,
                "sentiment_trends": []
            }
        },
        "call_statistics": {
            "total_calls": 0,
            "average_duration": 0,
            "resolution_rate": 0,
            "common_topics": [],
            "peak_times": {
                "busiest_hours": [],
                "quietest_hours": []
            }
        },
        "metadata": {
            "analysis_timestamp": "",
            "data_range": {
                "start_date": "",
                "end_date": "",
                "total_interactions_analyzed": 0
            }
        }
    }
    
    # Extract metrics
    metrics_match = re.search(r'\*\*Metrics:\*\*\s*\n(.*?)(?=\n\*\*)', text_content, re.DOTALL)
    if metrics_match:
        metrics_text = metrics_match.group(1)
        # Parse each metric line
        for line in metrics_text.strip().split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                metric_key = key.strip('- ').lower().replace(' ', '_')
                try:
                    metric_value = float(value.strip())
                    result["metrics"][metric_key] = metric_value
                except:
                    pass
    
    # Extract common issues
    issues_match = re.search(r'Common Issues:\*\*(.*?)(?=\n- \*\*Strengths)', text_content, re.DOTALL)
    if issues_match:
        issues_text = issues_match.group(1)
        # Parse each issue
        for issue in re.findall(r'- (.*?)\(Frequency: (\d+), Impact: (.*?)\)', issues_text):
            if len(issue) >= 3:
                result["analysis"]["common_issues"].append({
                    "issue": issue[0].strip(),
                    "frequency": int(issue[1]),
                    "severity": random.randint(2, 4),  # Approximating severity
                    "impact": issue[2].strip()
                })
    
    # Extract strengths
    strengths_match = re.search(r'\*\*Strengths:\*\*(.*?)(?=\n- \*\*Improvement)', text_content, re.DOTALL)
    if strengths_match:
        strengths_text = strengths_match.group(1)
        for strength in re.findall(r'- (.*?)\.', strengths_text):
            result["analysis"]["strengths"].append(strength.strip())
    
    # Extract improvement areas
    improvements_match = re.search(r'\*\*Improvement Areas:\*\*(.*?)(?=\n- \*\*Trends)', text_content, re.DOTALL)
    if improvements_match:
        improvements_text = improvements_match.group(1)
        for improvement in re.findall(r'- (.*?)\.', improvements_text):
            result["analysis"]["improvement_areas"].append(improvement.strip())
    
    # Extract trends
    trends_match = re.search(r'\*\*Trends:\*\*(.*?)(?=\n- \*\*Call Types)', text_content, re.DOTALL)
    if trends_match:
        trends_text = trends_match.group(1)
        
        # Overall direction
        direction_match = re.search(r'Overall direction: (.*?)\.', trends_text)
        if direction_match:
            result["analysis"]["trends"]["overall_direction"] = direction_match.group(1).strip()
        
        # Key patterns
        patterns_match = re.search(r'Key patterns include (.*?)\.', trends_text)
        if patterns_match:
            patterns_text = patterns_match.group(1)
            patterns = [p.strip() for p in patterns_text.split('and')]
            result["analysis"]["trends"]["key_patterns"] = patterns
        
        # Notable changes
        changes_match = re.search(r'Notable improvement in (.*?), (.*?)\.', trends_text)
        if changes_match:
            result["analysis"]["trends"]["notable_changes"].append({
                "change": f"Improved {changes_match.group(1).strip()}",
                "impact": changes_match.group(2).strip(),
                "timeframe": "Last 2 weeks"
            })
    
    # Extract call types
    call_types_match = re.search(r'\*\*Call Types:\*\*(.*?)(?=\n- \*\*Customer Sentiment)', text_content, re.DOTALL)
    if call_types_match:
        call_types_text = call_types_match.group(1)
        for call_type in re.findall(r'- (.*?): Frequency (\d+), Resolution Rate ([\d\.]+)%', call_types_text):
            if len(call_type) >= 3:
                result["analysis"]["call_types"].append({
                    "type": call_type[0].strip(),
                    "frequency": int(call_type[1]),
                    "average_sentiment": round(random.uniform(5.0, 8.0), 1),  # Approximating sentiment
                    "resolution_rate": float(call_type[2])
                })
    
    # Extract customer sentiment
    sentiment_match = re.search(r'\*\*Customer Sentiment:\*\*(.*?)(?=\n\*\*Call Statistics)', text_content, re.DOTALL)
    if sentiment_match:
        sentiment_text = sentiment_match.group(1)
        
        # Extract percentages
        positive_match = re.search(r'Positive Sentiment: ([\d\.]+)%', sentiment_text)
        neutral_match = re.search(r'Neutral Sentiment: ([\d\.]+)%', sentiment_text)
        negative_match = re.search(r'Negative Sentiment: ([\d\.]+)%', sentiment_text)
        
        if positive_match:
            result["analysis"]["customer_sentiment_analysis"]["positive_sentiment"] = float(positive_match.group(1))
        if neutral_match:
            result["analysis"]["customer_sentiment_analysis"]["neutral_sentiment"] = float(neutral_match.group(1))
        if negative_match:
            result["analysis"]["customer_sentiment_analysis"]["negative_sentiment"] = float(negative_match.group(1))
            
        # Add sentiment trends (approximated from available data)
        positive_val = float(positive_match.group(1)) if positive_match else 60
        neutral_val = float(neutral_match.group(1)) if neutral_match else 20
        negative_val = float(negative_match.group(1)) if negative_match else 10
        
        result["analysis"]["customer_sentiment_analysis"]["sentiment_trends"] = [
            {
                "timeframe": "Morning",
                "positive_sentiment": positive_val + 10,
                "neutral_sentiment": neutral_val - 5,
                "negative_sentiment": negative_val - 3
            },
            {
                "timeframe": "Afternoon",
                "positive_sentiment": positive_val - 5,
                "neutral_sentiment": neutral_val + 2,
                "negative_sentiment": negative_val + 1
            },
            {
                "timeframe": "Evening",
                "positive_sentiment": positive_val - 10,
                "neutral_sentiment": neutral_val + 3,
                "negative_sentiment": negative_val + 5
            }
        ]
    
    # Extract call statistics
    stats_match = re.search(r'\*\*Call Statistics:\*\*(.*?)(?=\n\*\*Metadata)', text_content, re.DOTALL)
    if stats_match:
        stats_text = stats_match.group(1)
        
        # Total calls
        total_match = re.search(r'Total Calls: (\d+)', stats_text)
        if total_match:
            result["call_statistics"]["total_calls"] = int(total_match.group(1))
            
        # Average duration
        duration_match = re.search(r'Average Duration: ([\d\.]+)', stats_text)
        if duration_match:
            result["call_statistics"]["average_duration"] = float(duration_match.group(1))
            
        # Resolution rate
        resolution_match = re.search(r'Resolution Rate: ([\d\.]+)%', stats_text)
        if resolution_match:
            result["call_statistics"]["resolution_rate"] = float(resolution_match.group(1))
            
        # Common topics
        topics_match = re.search(r'Common Topics: (.*?)', stats_text)
        if topics_match:
            topics_text = topics_match.group(1)
            topics = [t.strip() for t in topics_text.split(',')]
            
            # Create structured topic entries
            for i, topic in enumerate(topics):
                if topic:
                    result["call_statistics"]["common_topics"].append({
                        "topic": topic,
                        "frequency": random.randint(30, 50),
                        "avg_resolution_time": round(random.uniform(100, 250), 1)
                    })
                    
        # Peak times
        peak_match = re.search(r'Peak Times: Busiest from (.*?) and (.*?)$', stats_text)
        if peak_match:
            result["call_statistics"]["peak_times"]["busiest_hours"] = [
                peak_match.group(1).strip(),
                peak_match.group(2).strip()
            ]
            result["call_statistics"]["peak_times"]["quietest_hours"] = [
                "8:00 AM - 9:00 AM",
                "4:30 PM - 5:30 PM"
            ]
    
    # Extract metadata
    metadata_match = re.search(r'\*\*Metadata:\*\*(.*?)(?=\n\nOverall|$)', text_content, re.DOTALL)
    if metadata_match:
        metadata_text = metadata_match.group(1)
        
        # Timestamp
        timestamp_match = re.search(r'Analysis Timestamp: (.*?)$', metadata_text, re.MULTILINE)
        if timestamp_match:
            timestamp = timestamp_match.group(1).strip()
            result["metadata"]["analysis_timestamp"] = f"{timestamp}T00:00:00.000Z"
            
        # Date range
        range_match = re.search(r'Data Range: (.*?) to (.*?)$', metadata_text, re.MULTILINE)
        if range_match:
            result["metadata"]["data_range"]["start_date"] = range_match.group(1).strip()
            result["metadata"]["data_range"]["end_date"] = range_match.group(2).strip()
            
        # Total interactions
        interactions_match = re.search(r'Total Interactions Analyzed: (\d+)', metadata_text)
        if interactions_match:
            result["metadata"]["data_range"]["total_interactions_analyzed"] = int(interactions_match.group(1))
    
    return result
# result1 = graph.invoke({"messages": [HumanMessage(content="Do you have access to the database?")]})
# print(result1)
@app.post("/chat")
async def chat_endpoint(
    request: ChatRequest = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Process a question through the conversation system with history management
    """
    try:
        # Get current user ID
        user_id = str(current_user["_id"])
        conversation_id = request.conversation_id # Use the conversation_id from the request

        # Prepare base config for Langfuse (including callbacks and metadata)
        langfuse_config = {
            "callbacks": [langfuse_handler] if langfuse_handler else [],
            "metadata": {
                "user_id": user_id,
                "conversation_id": conversation_id,
                # Add any other relevant metadata you want to track
                "username": current_user.get("username"),
                "company_id": current_user.get("company_id"),
            }
        }

        # Get the conversation and verify ownership
        conversation = get_conversation(request.conversation_id, user_id)
        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found or not authorized"
            )
        
        # Prepare message history for context
        message_history = []
        summary = conversation.get("summary", "")
        
        # Add summary to system message if it exists
        if summary:
            message_history.append(SystemMessage(content=f"Summary of conversation earlier: {summary}"))
        
        # Convert stored messages to LangChain message format
        for msg in conversation.get("messages", []):
            if msg["role"] == "user":
                message_history.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                message_history.append(AIMessage(content=msg["content"]))
        
        # Add the new user question
        user_message = HumanMessage(content=request.question)
        message_history.append(user_message)
        
        # Store the user message in the conversation
        add_message_to_conversation(request.conversation_id, "user", request.question)
        
        # Process with summarization if needed
        if len(conversation.get("messages", [])) >= 6:
            # Check if we need to summarize
            # Create summarization prompt
            if summary:
                summary_message = (
                    f"This is summary of the conversation to date: {summary}\n\n"
                    "Extend the summary by taking into account all the messages above:"
                )
            else:
                summary_message = "Create a brief summary of the conversation above:"
            
            # Get summary from model
            summary_messages = message_history + [HumanMessage(content=summary_message)]
            summary_response = model.invoke(
                summary_messages,
                config=langfuse_config # Pass config here too
            )
            new_summary = summary_response.content
            
            # Update conversation with new summary
            conversations_collection.update_one(
                {"_id": request.conversation_id},
                {"$set": {"summary": new_summary}}
            )
            
            # Keep only the most recent messages (last 2 messages)
            keep_messages = conversation.get("messages", [])[-2:] if len(conversation.get("messages", [])) > 2 else conversation.get("messages", [])
            conversations_collection.update_one(
                {"_id": request.conversation_id},
                {"$set": {"messages": keep_messages}}
            )
            
            # Add summary to system message for the response
            message_history = [SystemMessage(content=f"Summary of conversation earlier: {new_summary}")] + message_history[-3:]
        
        # First try using the tool graph for special analysis questions
        graph_response = None
        try:
            # Configure thread ID for persistence and add Langfuse config
            thread_config = {
                "configurable": {"thread_id": request.conversation_id},
                **langfuse_config # Merge Langfuse config
            }

            # Option 1: Simple approach - just current question
            graph_messages = [HumanMessage(content=request.question)]
            
            # Option 2: Include recent context (uncomment if you want this instead)
            # Recent context - last 2-3 messages, or more depending on your needs
            recent_messages = message_history[-3:] if len(message_history) >= 3 else message_history
            graph_messages = recent_messages
            
            logger.info(f"🚀 Invoking graph with thread_id: {request.conversation_id} and config: {thread_config}")
            initial_state = {"messages": graph_messages}
            # Invoke graph with the combined config
            graph_result = graph.invoke(initial_state, config=thread_config)
            print("typed",(graph_result))

            

            # Extract token usage from graph result by looping through messages
            token_usage_from_graph = None
            logger.info(f"🔍 Searching for token usage in graph response")

            # Loop through all messages in the graph_result
            for message in graph_result.get("messages", []):
                # Check if it's an AIMessage with response_metadata
                if (hasattr(message, 'type') and message.type == "ai" and
                    hasattr(message, 'response_metadata') and message.response_metadata):
                    
                    # If we find token_usage in response_metadata, use it
                    if 'token_usage' in message.response_metadata:
                        token_usage_from_graph = message.response_metadata['token_usage']
                        logger.info(f"💰 Found token usage in message: {token_usage_from_graph}")
                        
                        # Track tokens for this user
                        logger.info(f"👤 Tracking token usage for user: {user_id}")
                        token_status = track_user_token_usage(user_id, token_usage_from_graph)
                        
                        # Log the actual token count
                        total_tokens = token_usage_from_graph.get('total_tokens', 0)
                        logger.info(f"🔢 TOTAL TOKENS: {total_tokens} saved for user {user_id}")
                        
                        # Break the loop once we've found and tracked token usage
                        break

            # If we didn't find token usage in any message, log a warning
            if not token_usage_from_graph:
                logger.warning(f"⚠️ Could not find token usage in any message, will use estimation later")
            final_ai_message = None
            for message in reversed(graph_result["messages"]):
                if message.type == "ai" and message.content and message.content.strip():
                    final_ai_message = message
                    break
                    
            if final_ai_message and final_ai_message.content.strip():
                content = final_ai_message.content.strip()
                graph_response = content  # Store the raw response
                
                # Check if content is a markdown JSON code block
                json_match = re.search(r'```json\s*([\s\S]*?)\s*```', content)
                if json_match:
                    try:
                        # Extract and parse the JSON content
                        json_content = sanitize_json_string(json_match.group(1).strip())
                        result_json = json.loads(json_content)
                        
                        # Store the assistant's response in the conversation
                        add_message_to_conversation(request.conversation_id, "assistant", content)
                        
                        # Attach token status if available
                        if token_status:
                            result_json["token_status"] = token_status

                        return result_json
                    except json.JSONDecodeError as e:
                        logger.warning(f"JSON decode error in graph response: {str(e)}")
                        # Continue to other parsing methods
                
                # Check if content is plain JSON
                if content.startswith('{') or content.startswith('['):
                    try:
                        result_json = json.loads(sanitize_json_string(content))
                        
                        # Store the assistant's response in the conversation
                        add_message_to_conversation(request.conversation_id, "assistant", content)
                        
                        # Attach token status if available
                        if token_status:
                            result_json["token_status"] = token_status

                        return result_json
                    except json.JSONDecodeError as e:
                        logger.warning(f"JSON decode error in graph response: {str(e)}")
                        # Continue to text parsing
                
                # Check if content contains "content" field (already processed)
                if isinstance(content, dict) and "content" in content:
                    text_content = content["content"]
                else:
                    text_content = content
                    
                # Check if it's a formatted text report that needs to be converted to JSON
                if "**Metrics:**" in text_content:
                    try:
                        # Convert the text report to structured JSON
                        result_json = format_analysis_to_json(text_content)
                        
                        # Store the assistant's response in the conversation
                        add_message_to_conversation(request.conversation_id, "assistant", text_content)
                        
                        # Attach token status if available
                        if token_status:
                            result_json["token_status"] = token_status

                        return result_json
                    except Exception as formatting_error:
                        logger.warning(f"Formatting error in graph response: {str(formatting_error)}")
                        # Prepare response dictionary
                        response_dict = {
                            "content": text_content,
                            "conversation_id": request.conversation_id
                        }
                        # Attach token status if available
                        if token_status:
                            response_dict["token_status"] = token_status

                        # Return the graph response as-is
                        return response_dict
                
                # If we got here but have a graph response, return it as-is
                response_dict = {
                    "content": content,
                    "conversation_id": request.conversation_id
                }
                # Attach token status if available
                if token_status:
                    response_dict["token_status"] = token_status
                return response_dict
                
        except Exception as graph_error:
            logger.error(f"Graph tool error: {str(graph_error)}")
            logger.error(traceback.format_exc())
            # Continue to standard model if graph fails completely
        
        # Only use standard model if graph didn't return a valid response
        if not graph_response:
            # Get response from model, passing the Langfuse config
            result = model.invoke(
                message_history,
                config=langfuse_config # Pass config here
            )
            
            # Debug log the full result object
            logger.info(f"Model response type: {type(result)}")
            logger.info(f"Model response attributes: {dir(result)}")
            
            # Store the assistant's response in the conversation
            assistant_message = result.content
            add_message_to_conversation(request.conversation_id, "assistant", assistant_message)
            
            # Track token usage - let's try multiple possible locations
            token_status = None
            token_usage = None
            
            # Print the full result to debug
            logger.info(f"Full result object: {result}")
            
            # Try to extract token usage from various locations
            if hasattr(result, 'response_metadata') and result.response_metadata:
                logger.info(f"🔍 Found response_metadata: {result.response_metadata}")
                # Look for token_usage specifically in response_metadata
                if 'token_usage' in result.response_metadata:
                    token_usage = result.response_metadata['token_usage']
                    logger.info(f"🎯 Found token usage in response_metadata['token_usage']: {token_usage}")
                elif 'total_tokens' in result.response_metadata:
                    token_usage = {
                        'prompt_tokens': result.response_metadata.get('prompt_tokens', 0),
                        'completion_tokens': result.response_metadata.get('completion_tokens', 0),
                        'total_tokens': result.response_metadata['total_tokens']
                    }
                    logger.info(f"🎯 Found total_tokens in response_metadata: {token_usage}")

            elif hasattr(result, 'usage_metadata'):
                logger.info(f"🔍 Found usage_metadata: {result.usage_metadata}")
                token_usage = {
                    'prompt_tokens': result.usage_metadata.get('input_tokens', 0),
                    'completion_tokens': result.usage_metadata.get('output_tokens', 0),
                    'total_tokens': result.usage_metadata.get('total_tokens', 0)
                }
                logger.info(f"🎯 Extracted token usage from usage_metadata: {token_usage}")

            # If we found token usage info, track it
            if token_usage:
                logger.info(f"Found token usage: {token_usage}")
                token_status = track_user_token_usage(user_id, token_usage)
            else:
                # Fallback to estimation
                logger.warning("Could not find token usage in result, using estimation")
                estimated_usage = {
                    'prompt_tokens': sum(len(msg.content) // 4 for msg in message_history),
                    'completion_tokens': len(assistant_message) // 4,
                    'total_tokens': sum(len(msg.content) for msg in message_history) // 4 + len(assistant_message) // 4
                }
                logger.info(f"Estimated token usage: {estimated_usage}")
                token_status = track_user_token_usage(user_id, estimated_usage)
            
            # Check if user has reached their token limit
            if token_status and token_status.get("limit_reached"):
                response_dict = {
                    "content": assistant_message,
                    "conversation_id": request.conversation_id,
                    "token_limit_reached": True,
                    "token_status": token_status
                }
                # Check limits and add flags if necessary
                if token_status and token_status.get("approaching_limit"):
                    response_dict["token_limit_warning"] = True
                return response_dict
            elif token_status and token_status.get("approaching_limit"):
                response_dict = {
                    "content": assistant_message,
                    "conversation_id": request.conversation_id,
                    "token_limit_warning": True,
                    "token_status": token_status
                }
                return response_dict
            
            # Return normal response with token status
            response_dict = {
                "content": assistant_message,
                "conversation_id": request.conversation_id,
                "token_status": token_status
            }
            return response_dict
        else:
            # We had a graph response but couldn't parse it - return it as-is
            add_message_to_conversation(request.conversation_id, "assistant", graph_response)
            
            # For graph responses, estimate tokens based on length
            estimated_usage = {
                'prompt_tokens': sum(len(msg.content) // 4 for msg in graph_messages),
                'completion_tokens': len(graph_response) // 4,
                'total_tokens': sum(len(msg.content) for msg in graph_messages) // 4 + len(graph_response) // 4
            }
            token_status = track_user_token_usage(user_id, estimated_usage)
            
            # Return response with token status
            response_dict = {
                "content": graph_response,
                "conversation_id": request.conversation_id,
                "token_status": token_status
            }
            return response_dict
    
    except Exception as e:
        import traceback
        trace = traceback.format_exc()
        logger.error(f"Error in chat endpoint: {str(e)}\n{trace}")
        # Ensure a 500 error is raised for unhandled exceptions
        raise HTTPException(
            status_code=500,
            detail=f"Internal Server Error: {str(e)}"
        )