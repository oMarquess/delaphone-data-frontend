export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
        <button className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">
          Generate Report
        </button>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Available Reports</h2>
        <p className="text-gray-600">Your reports and data exports will appear here.</p>
      </div>
    </div>
  );
} 