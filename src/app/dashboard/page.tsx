export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-white text-gray-800 border border-gray-200 rounded-md hover:bg-gray-50">
            Export
          </button>
          <button className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">
            New Report
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Summary Cards */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Total Calls</h3>
          <p className="text-3xl font-bold text-gray-800">3,721</p>
          <div className="mt-2 text-green-600 text-sm">+12% from last month</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Average Duration</h3>
          <p className="text-3xl font-bold text-gray-800">5m 32s</p>
          <div className="mt-2 text-red-600 text-sm">-3% from last month</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Customer Satisfaction</h3>
          <p className="text-3xl font-bold text-gray-800">92%</p>
          <div className="mt-2 text-green-600 text-sm">+5% from last month</div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Recent Activities</h2>
        <div className="divide-y divide-gray-200">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="py-4 flex justify-between">
              <div>
                <p className="text-gray-800">Call ID #{1000 + item}</p>
                <p className="text-gray-500 text-sm">Agent: John Doe</p>
              </div>
              <div className="text-right">
                <p className="text-gray-800">4m 12s</p>
                <p className="text-gray-500 text-sm">Today, 2:30 PM</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 