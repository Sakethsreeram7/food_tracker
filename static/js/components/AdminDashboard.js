// AdminDashboard Component
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = React.useState('daily'); // 'daily', 'qrcode', 'history', 'schedules'
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = React.useState(null);
  const [mealTypes, setMealTypes] = React.useState([]);
  
  // Daily tab state
  const [optedMeals, setOptedMeals] = React.useState({});
  
  // QR code tab state
  const [qrCodeData, setQrCodeData] = React.useState(null);
  const [regenerating, setRegenerating] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  
  // History tab state
  const [historyData, setHistoryData] = React.useState([]);
  const [historyStartDate, setHistoryStartDate] = React.useState('');
  const [historyEndDate, setHistoryEndDate] = React.useState('');
  
  // Schedules tab state
  const [weekdaySchedules, setWeekdaySchedules] = React.useState([]);
  const [weekendSchedules, setWeekendSchedules] = React.useState([]);
  const [showScheduleModal, setShowScheduleModal] = React.useState(false);
  const [selectedScheduleType, setSelectedScheduleType] = React.useState('weekday'); // 'weekday' or 'weekend'
  const [selectedScheduleId, setSelectedScheduleId] = React.useState(null);
  const [selectedDay, setSelectedDay] = React.useState(0); // 0-6 for Monday-Sunday
  const [openTime, setOpenTime] = React.useState('');
  const [closeTime, setCloseTime] = React.useState('');
  const [updatingSchedule, setUpdatingSchedule] = React.useState(false);
  
  // Fetch meal types on component mount
  React.useEffect(() => {
    const fetchMealTypes = async () => {
      try {
        const response = await fetch('/api/meals');
        const data = await response.json();
        
        if (response.ok) {
          setMealTypes(data.meal_types);
          if (data.meal_types.length > 0) {
            setSelectedMealType(data.meal_types[0].id);
          }
        } else {
          setError(data.message || 'Failed to load meal types');
        }
      } catch (err) {
        setError('An error occurred while loading meal types');
        console.error('Meal types error:', err);
      }
    };
    
    fetchMealTypes();
  }, []);
  
  // Fetch data based on active tab
  React.useEffect(() => {
    if (activeTab === 'daily') {
      fetchOptedMeals();
    } else if (activeTab === 'qrcode') {
      fetchQRCode();
    } else if (activeTab === 'history') {
      fetchHistoricalData();
    } else if (activeTab === 'schedules') {
      fetchSchedules();
    }
  }, [activeTab, selectedDate, selectedMealType]);
  
  // Set up auto-refresh interval for QR code
  React.useEffect(() => {
    let refreshInterval;
    
    if (activeTab === 'qrcode') {
      // Auto-refresh QR code every 5 seconds
      refreshInterval = setInterval(() => {
        fetchQRCode(true);
      }, 5000);
    }
    
    // Clean up interval on component unmount or tab change
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [activeTab, selectedDate]);
  
  // Format date for display with IST timezone
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    // Create a date string in IST timezone
    return new Intl.DateTimeFormat('en-IN', { 
      timeZone: 'Asia/Kolkata',
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date);
  };
  
  // Format time for display with IST timezone
  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    // Create a time string in IST timezone
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    }).format(date);
  };
  
  // Fetch opted-in meals
  const fetchOptedMeals = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/admin/opted-meals?date=${selectedDate}`);
      
      if (response.ok) {
        const data = await response.json();
        setOptedMeals(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch opted-in meals');
      }
    } catch (err) {
      setError('An error occurred while fetching opted-in meals');
      console.error('Admin dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch QR code
  const fetchQRCode = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/admin/daily-qr?date=${selectedDate}`);
      
      if (response.ok) {
        const data = await response.json();
        setQrCodeData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch QR code');
      }
    } catch (err) {
      setError('An error occurred while fetching QR code');
      console.error('QR code error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Regenerate QR code
  const handleRegenerateQR = async () => {
    if (!window.confirm('Are you sure you want to regenerate the QR code? The old one will no longer work.')) {
      return;
    }
    
    setRegenerating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/admin/regenerate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: selectedDate }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setQrCodeData(data);
        setSuccess('QR code regenerated successfully');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to regenerate QR code');
      }
    } catch (err) {
      setError('An error occurred while regenerating QR code');
      console.error('Regenerate QR error:', err);
    } finally {
      setRegenerating(false);
    }
  };
  
  // Fetch schedules
  const fetchSchedules = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/admin/schedules');
      
      if (response.ok) {
        const data = await response.json();
        setWeekdaySchedules(data.weekday_schedules);
        setWeekendSchedules(data.weekend_schedules);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch schedules');
      }
    } catch (err) {
      setError('An error occurred while fetching schedules');
      console.error('Schedules error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Open schedule modal
  const handleOpenScheduleModal = () => {
    // Default to weekday and Monday
    setSelectedScheduleType('weekday');
    setSelectedDay(0);
    
    // Find the schedule for Monday
    const schedule = weekdaySchedules.find(s => s.day_of_week === 0);
    
    if (schedule) {
      setSelectedScheduleId(schedule.id);
      setOpenTime(schedule.open_time);
      setCloseTime(schedule.close_time);
    }
    
    setShowScheduleModal(true);
  };
  
  // Handle day change in modal
  const handleDayChange = (day) => {
    setSelectedDay(parseInt(day));
    
    // Find the schedule for the selected day
    const schedules = selectedScheduleType === 'weekday' ? weekdaySchedules : weekendSchedules;
    const schedule = schedules.find(s => s.day_of_week === parseInt(day));
    
    if (schedule) {
      setSelectedScheduleId(schedule.id);
      setOpenTime(schedule.open_time);
      setCloseTime(schedule.close_time);
    }
  };
  
  // Handle save schedule
  const handleSaveSchedule = async () => {
    if (!selectedScheduleId) return;
    
    setUpdatingSchedule(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/admin/schedules/${selectedScheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          open_time: openTime,
          close_time: closeTime
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update the schedules in the state
        if (selectedScheduleType === 'weekend') {
          setWeekendSchedules(prevSchedules => 
            prevSchedules.map(schedule => 
              schedule.id === selectedScheduleId ? data.schedule : schedule
            )
          );
        } else {
          setWeekdaySchedules(prevSchedules => 
            prevSchedules.map(schedule => 
              schedule.id === selectedScheduleId ? data.schedule : schedule
            )
          );
        }
        
        // Check if the current time is within the updated schedule time range
        // to immediately reflect the changes and open opt-in chance
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        
        // Check if current time is between open and close time
        const isWithinTimeRange = currentTimeStr >= openTime && currentTimeStr <= closeTime;
        
        if (isWithinTimeRange) {
          // Refresh the schedules to immediately reflect changes
          fetchSchedules();
          setSuccess(`Schedule for ${data.schedule.day_name} updated successfully! The changes are effective immediately as the current time is within the updated schedule range.`);
        } else {
          setSuccess(`Schedule for ${data.schedule.day_name} updated successfully! The changes will take effect when the scheduled time is reached.`);
        }
        
        setShowScheduleModal(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update schedule');
      }
    } catch (err) {
      setError('An error occurred while updating schedule');
      console.error('Update schedule error:', err);
    } finally {
      setUpdatingSchedule(false);
    }
  };
  
  // Handle close modal
  const handleCloseModal = () => {
    setShowScheduleModal(false);
    setSelectedScheduleId(null);
    setOpenTime('');
    setCloseTime('');
  };
  
  // Fetch historical data
  const fetchHistoricalData = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      let url = '/api/admin/historical-data';
      if (selectedMealType) {
        url += `?meal_type_id=${selectedMealType}`;
      }
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setHistoryData(data.data);
        setHistoryStartDate(data.start_date);
        setHistoryEndDate(data.end_date);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch historical data');
      }
    } catch (err) {
      setError('An error occurred while fetching historical data');
      console.error('Historical data error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Export to CSV
  const handleExport = async () => {
    try {
      // Get the meal type name for the filename
      const mealTypeName = selectedMealType ? 
        mealTypes.find(m => m.id === selectedMealType)?.name || 'all' : 
        'all';
      
      // Create CSV content from the opted meals data
      let csvContent = "name,email,meal_type,opt_in_time\n";
      
      if (optedMeals.meal_types) {
        optedMeals.meal_types.forEach(mealType => {
          mealType.users.forEach(user => {
            csvContent += `"${user.name}","${user.email}","${mealType.name}","${user.opt_in_time || ''}"\n`;
          });
        });
      }
      
      // Create a Blob with the CSV data
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `meal-opt-ins-${selectedDate}-${mealTypeName}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
      
      setSuccess('CSV exported successfully');
    } catch (err) {
      setError('An error occurred while exporting CSV');
      console.error('Export error:', err);
    }
  };
  
  // Download QR code
  const handleDownloadQR = () => {
    if (!qrCodeData) return;
    
    // Create a temporary link element and trigger download
    const link = document.createElement('a');
    link.href = qrCodeData.qr_code_url;
    link.download = `qr-code-${selectedDate}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSuccess('QR code downloaded successfully');
  };
  
  // Render daily opted meals tab
  const renderDailyTab = () => {
    if (!optedMeals.meal_types) {
      return <p>No data available for the selected date.</p>;
    }
    
    return (
      <div className="daily-opted-meals">
        <div className="flex justify-between items-center mb-4">
          <div>
            <label className="mr-2">Date:</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input"
            />
          </div>
          
          <div className="flex gap-2">
            <button 
              className="btn btn-primary"
              onClick={fetchOptedMeals}
              disabled={loading}
            >
              Refresh
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={loading || !optedMeals.meal_types || optedMeals.meal_types.length === 0}
            >
              Export CSV
            </button>
          </div>
        </div>
        
        {optedMeals.meal_types.map(mealType => (
          <div key={mealType.id} className="meal-type-section mb-6">
            <h3 className="text-xl font-bold mb-2">
              {mealType.name} ({mealType.users.length} users)
            </h3>
            
            {mealType.users.length === 0 ? (
              <p>No users opted in for {mealType.name}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Opt-In Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mealType.users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{formatTime(user.opt_in_time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  // Render QR code tab
  const renderQRCodeTab = () => {
    return (
      <div className="qr-code-tab">
        <div className="flex justify-between items-center mb-4">
          <div>
            <label className="mr-2">Date:</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input"
            />
          </div>
          
          <div className="flex gap-2">
            <button 
              className="btn btn-primary"
              onClick={() => fetchQRCode(true)}
              disabled={loading || refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={handleDownloadQR}
              disabled={loading || !qrCodeData}
            >
              Download QR
            </button>
            
            <button 
              className="btn btn-danger"
              onClick={handleRegenerateQR}
              disabled={regenerating}
            >
              Regenerate QR
            </button>
          </div>
        </div>
        
        {qrCodeData && (
          <div className="qr-code-display text-center">
            <h3 className="text-xl font-bold mb-2">
              Daily QR Code for {formatDate(qrCodeData.date)}
            </h3>
            <p className="text-sm text-gray-500 mb-2">
              Auto-refreshes every 5 seconds
            </p>
            
            <div className="qr-image mb-4">
              <img 
                src={qrCodeData.qr_code_url} 
                alt="QR Code" 
                className="mx-auto"
                style={{ maxWidth: '300px' }}
              />
            </div>
            
            <div className="verification-url mb-4">
              <p className="mb-1"><strong>Verification URL:</strong></p>
              <input 
                type="text" 
                value={qrCodeData.verification_url} 
                readOnly 
                className="form-input w-full"
                onClick={(e) => e.target.select()}
              />
            </div>
            
            <div className="qr-instructions">
              <p>Print this QR code and post it in the cafeteria for users to scan.</p>
              <p>Users will see their meal status when they scan this code.</p>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render schedules tab
  const renderSchedulesTab = () => {
    return (
      <div className="schedules-tab">
        <h3 className="text-xl font-bold mb-4">Opt-In Schedule Management</h3>
        
        <div className="schedule-actions mb-4 flex gap-4 justify-center">
          <button 
            className="btn btn-primary"
            onClick={() => handleOpenScheduleModal()}
          >
            Edit Schedule
          </button>
        </div>
        
        <div className="weekday-schedules mb-6">
          <h4 className="text-lg font-bold mb-2">Weekday Schedules</h4>
          <p className="mb-4">These schedules control when users can opt-in for meals on weekdays.</p>
          
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Open Time</th>
                  <th>Close Time</th>
                </tr>
              </thead>
              <tbody>
                {weekdaySchedules.map(schedule => (
                  <tr key={schedule.id}>
                    <td>{schedule.day_name}</td>
                    <td>{schedule.open_time}</td>
                    <td>{schedule.close_time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="weekend-schedules mb-6">
          <h4 className="text-lg font-bold mb-2">Weekend Schedules</h4>
          <p className="mb-4">These schedules control when users can opt-in for meals on weekends.</p>
          
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Open Time</th>
                  <th>Close Time</th>
                </tr>
              </thead>
              <tbody>
                {weekendSchedules.map(schedule => (
                  <tr key={schedule.id}>
                    <td>{schedule.day_name}</td>
                    <td>{schedule.open_time}</td>
                    <td>{schedule.close_time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {showScheduleModal && (
          <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div className="modal-content" style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '0.5rem',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <h4 className="text-lg font-bold mb-4">
                Edit Schedule
              </h4>
              
              <div className="schedule-type-tabs mb-4">
                <div className="flex border-b">
                  <button 
                    className={`py-2 px-4 ${selectedScheduleType === 'weekday' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
                    onClick={() => {
                      setSelectedScheduleType('weekday');
                      setSelectedDay(0); // Default to Monday
                      const schedule = weekdaySchedules.find(s => s.day_of_week === 0);
                      if (schedule) {
                        setSelectedScheduleId(schedule.id);
                        setOpenTime(schedule.open_time);
                        setCloseTime(schedule.close_time);
                      }
                    }}
                    disabled={updatingSchedule}
                  >
                    Weekday
                  </button>
                  <button 
                    className={`py-2 px-4 ${selectedScheduleType === 'weekend' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
                    onClick={() => {
                      setSelectedScheduleType('weekend');
                      setSelectedDay(5); // Default to Saturday
                      const schedule = weekendSchedules.find(s => s.day_of_week === 5);
                      if (schedule) {
                        setSelectedScheduleId(schedule.id);
                        setOpenTime(schedule.open_time);
                        setCloseTime(schedule.close_time);
                      }
                    }}
                    disabled={updatingSchedule}
                  >
                    Weekend
                  </button>
                </div>
              </div>
              
              <div className="form-group mb-3">
                <label className="form-label">Select Day:</label>
                <select 
                  className="form-select" 
                  value={selectedDay}
                  onChange={(e) => handleDayChange(e.target.value)}
                  disabled={updatingSchedule}
                >
                  {selectedScheduleType === 'weekday' ? (
                    <>
                      <option value="0">Monday</option>
                      <option value="1">Tuesday</option>
                      <option value="2">Wednesday</option>
                      <option value="3">Thursday</option>
                      <option value="4">Friday</option>
                    </>
                  ) : (
                    <>
                      <option value="5">Saturday</option>
                      <option value="6">Sunday</option>
                    </>
                  )}
                </select>
              </div>
              
              <div className="form-group mb-3">
                <label className="form-label">Open Time (24-hour format):</label>
                <input 
                  type="time" 
                  className="form-input" 
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  disabled={updatingSchedule}
                />
              </div>
              
              <div className="form-group mb-3">
                <label className="form-label">Close Time (24-hour format):</label>
                <input 
                  type="time" 
                  className="form-input" 
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  disabled={updatingSchedule}
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <button 
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                  disabled={updatingSchedule}
                >
                  Cancel
                </button>
                
                <button 
                  className="btn btn-primary"
                  onClick={handleSaveSchedule}
                  disabled={updatingSchedule}
                >
                  {updatingSchedule ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="schedule-info mt-4">
          <h4 className="text-lg font-bold mb-2">Schedule Information:</h4>
          <ul className="ml-4" style={{ listStyleType: 'disc' }}>
            <li><strong>Weekday Schedule:</strong> Controls opt-in for next day's meals (e.g., Monday 8:00 PM to Tuesday 9:00 AM for Tuesday's meals)</li>
            <li><strong>Weekend Schedule:</strong> Controls opt-in for weekend meals (Friday 8:00 PM to Sunday 4:00 PM)</li>
            <li><strong>Time Format:</strong> Use 24-hour format (e.g., 20:00 for 8:00 PM, 09:00 for 9:00 AM)</li>
          </ul>
        </div>
      </div>
    );
  };
  
  // Render historical data tab
  const renderHistoryTab = () => {
    return (
      <div className="history-tab">
        <div className="flex justify-between items-center mb-4">
          <div>
            <label className="mr-2">Meal Type:</label>
            <select 
              value={selectedMealType || ''}
              onChange={(e) => setSelectedMealType(e.target.value ? Number(e.target.value) : null)}
              className="form-select"
            >
              <option value="">All Meal Types</option>
              {mealTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          
          <button 
            className="btn btn-primary"
            onClick={fetchHistoricalData}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
        
        {historyStartDate && historyEndDate && (
          <p className="mb-4">
            Showing data from {formatDate(historyStartDate)} to {formatDate(historyEndDate)}
          </p>
        )}
        
        {historyData.length === 0 ? (
          <p>No historical data available.</p>
        ) : (
          <div className="history-data">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Meal Type</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((day) => (
                    day.meals.map((meal, index) => (
                      <tr key={`${day.date}-${meal.meal_type_id}`}>
                        {index === 0 && <td rowSpan={day.meals.length}>{formatDate(day.date)}</td>}
                        <td>{meal.name}</td>
                        <td>{meal.count}</td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
      
      {error && (
        <div className="status status-danger mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="status status-success mb-4">
          {success}
        </div>
      )}
      
      <div className="tabs mb-4">
        <button 
          className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          Daily Opt-Ins
        </button>
        <button 
          className={`tab-btn ${activeTab === 'qrcode' ? 'active' : ''}`}
          onClick={() => setActiveTab('qrcode')}
        >
          QR Code
        </button>
        <button 
          className={`tab-btn ${activeTab === 'schedules' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedules')}
        >
          Schedules
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Historical Data
        </button>
      </div>
      
      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : (
        <>
          {activeTab === 'daily' && renderDailyTab()}
          {activeTab === 'qrcode' && renderQRCodeTab()}
          {activeTab === 'schedules' && renderSchedulesTab()}
          {activeTab === 'history' && renderHistoryTab()}
        </>
      )}
      
      <div className="mt-6">
        <h3 className="text-lg font-bold mb-2">Admin Actions:</h3>
        <ul className="ml-4" style={{ listStyleType: 'disc' }}>
          <li><strong>Daily Opt-Ins:</strong> View and export users opted in for meals by date</li>
          <li><strong>QR Code:</strong> Generate, download, and manage daily QR codes</li>
          <li><strong>Schedules:</strong> Configure opt-in opening and closing times</li>
          <li><strong>Historical Data:</strong> View meal opt-in statistics for the past 2 months</li>
        </ul>
      </div>
    </div>
  );
};
