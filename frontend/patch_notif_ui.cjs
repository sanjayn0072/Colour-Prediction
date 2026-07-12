const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/LegacyAdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const notifUI = `
        {/* Alerts & Notifications Center */}
        {activeTab === 'notifications' && isSuperAdmin && (
          <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex justify-between items-center bg-gray-900/50 p-6 rounded-2xl border border-gray-800 backdrop-blur-xl">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Bell className="text-purple-400" /> Centralized Alerts & Notifications Center
                </h2>
                <p className="text-gray-400 mt-1">Dispatch global broadcasts or target specific users.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Broadcast Form */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-xl backdrop-blur-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="text-purple-400 w-5 h-5" /> New Broadcast
                  </h3>
                  
                  <form onSubmit={handleBroadcastSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Target Audience</label>
                      <select 
                        className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                        value={broadcastTarget}
                        onChange={(e) => setBroadcastTarget(e.target.value)}
                      >
                        <option value="ALL">Broadcast to All Users</option>
                        <option value="SPECIFIC_USER">Target Specific User ID</option>
                      </select>
                    </div>

                    <div className={\`transition-all duration-300 overflow-hidden \${broadcastTarget === 'SPECIFIC_USER' ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}\`}>
                      <label className="block text-sm font-medium text-gray-400 mb-1">User ID</label>
                      <input 
                        type="number"
                        className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="e.g. 1"
                        value={broadcastUserId}
                        onChange={(e) => setBroadcastUserId(e.target.value)}
                        required={broadcastTarget === 'SPECIFIC_USER'}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Notification Type</label>
                      <select 
                        className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                        value={broadcastType}
                        onChange={(e) => setBroadcastType(e.target.value)}
                      >
                        <option value="SYSTEM_ALERT">System Alert</option>
                        <option value="COUPON">Coupon / Promo</option>
                        <option value="WITHDRAWAL">Withdrawal Notice</option>
                        <option value="DEPOSIT">Deposit Notice</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                      <input 
                        type="text"
                        className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="e.g. Maintenance Break"
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Message Body</label>
                      <textarea 
                        className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[100px]"
                        placeholder="Enter the broadcast message..."
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        required
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={broadcasting}
                      className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {broadcasting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
                      {broadcasting ? 'Dispatching...' : 'Dispatch Broadcast'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Broadcast Logs */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-xl backdrop-blur-sm relative overflow-hidden group">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Database className="text-purple-400 w-5 h-5" /> Recent Broadcast Logs
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-800/50">
                        <tr>
                          <th className="px-6 py-4 rounded-tl-xl">Time</th>
                          <th className="px-6 py-4">Type</th>
                          <th className="px-6 py-4">Target</th>
                          <th className="px-6 py-4">Title</th>
                          <th className="px-6 py-4 rounded-tr-xl">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {broadcastLogs.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center py-8 text-gray-500">No broadcasts found.</td>
                          </tr>
                        ) : (
                          broadcastLogs.map((log) => (
                            <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-gray-800 text-gray-300 rounded-lg text-xs font-medium border border-gray-700">
                                  {log.type}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {log.userId === null ? (
                                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium">ALL USERS</span>
                                ) : (
                                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium">USER {log.userId}</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-white font-medium">{log.title}</td>
                              <td className="px-6 py-4 max-w-xs truncate" title={log.message}>{log.message}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
`;

if (!content.includes('Centralized Alerts & Notifications Center')) {
  if (content.includes("{activeTab === 'config' && (")) {
    content = content.replace(
      "{activeTab === 'config' && (",
      notifUI + "\n\n        {activeTab === 'config' && ("
    );
    fs.writeFileSync(path, content);
    console.log('UI injected.');
  } else {
    console.log('Could not find anchor to inject UI.');
  }
} else {
  console.log('UI already injected.');
}
