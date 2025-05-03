export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <button className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">
          Save Changes
        </button>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Account Settings</h2>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
              defaultValue="John Doe"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
              defaultValue="john.doe@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notification Preferences</label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input type="checkbox" id="email-notif" className="mr-2" defaultChecked />
                <label htmlFor="email-notif">Email Notifications</label>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="sms-notif" className="mr-2" />
                <label htmlFor="sms-notif">SMS Notifications</label>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 