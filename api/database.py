from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import Depends, HTTPException
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

# MongoDB connection settings
MONGODB_HOST = os.getenv("MONGODB_HOST")
MONGODB_PORT = int(os.getenv("MONGODB_PORT"))
DATABASE_NAME = os.getenv("DATABASE_NAME_USERS", "users")

# Construct the MongoDB URL
MONGODB_URL = f"{MONGODB_HOST}:{MONGODB_PORT}"
print(MONGODB_URL)
logger.info(f"Connecting to MongoDB at: {MONGODB_URL}, Database: {DATABASE_NAME}")

# Create MongoDB client
try:
    client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
    db = client[DATABASE_NAME]
    logger.info("AsyncIO MongoDB client initialized.")
except Exception as e:
    logger.error(f"Error initializing AsyncIO MongoDB client: {e}")
    client = None
    db = None
    raise

async def get_database():
    if client is None or db is None:
        logger.error("MongoDB client or db object is None. Cannot get database.")
        raise HTTPException(status_code=500, detail="Database connection not available")
    try:
        await client.admin.command('ping')
        logger.debug("MongoDB connection successful (ping).")
        return db
    except Exception as e:
        logger.error(f"Error connecting to MongoDB or pinging: {e}")
        raise HTTPException(status_code=503, detail=f"Database connection error: {e}") 