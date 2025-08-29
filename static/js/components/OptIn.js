// OptIn Component
const OptIn = ({ user, setUser }) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  const [mealTypes, setMealTypes] = React.useState([]);
  const [optInStatus, setOptInStatus] = React.useState([]);
  const [weeklyPreferences, setWeeklyPreferences] = React.useState([]);
  const [selectedDate, setSelectedDate] = React.useState(null);
  const [isOptInOpen, setIsOptInOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('daily'); // 'daily' or 'weekly'
  const [dailySubmitted, setDailySubmitted] = React.useState(false);
  const [weeklySubmitted, setWeeklySubmitted] = React.useState(false);
  const [dailyModified, setDailyModified] = React.useState(false);
  const [weeklyModified, setWeeklyModified] = React.useState(false);
  
  // Format time for display with IST timezone
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    // Create a time string in IST timezone
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    }).format(date);
  };
  
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
  
  // Load meal types on component mount
  React.useEffect(() => {
    const fetchMealTypes = async () => {
      try {
        const response = await fetch('/api/meals');
        const data = await response.json();
        
        if (response.ok) {
          setMealTypes(data.meal_types);
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
  
  // Load opt-in status for tomorrow
  React.useEffect(() => {
    const fetchOptInStatus = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // If selectedDate is null, the API will default to tomorrow
        const dateParam = selectedDate ? `?date=${selectedDate}` : '';
        const response = await fetch(`/api/meals/opt-in-status${dateParam}`);
        const data = await response.json();
        
        if (response.ok) {
          setOptInStatus(data.meals);
          setSelectedDate(data.date);
          setIsOptInOpen(data.is_opt_in_open);
        } else {
          setError(data.message || 'Failed to load opt-in status');
        }
      } catch (err) {
        setError('An error occurred while loading opt-in status');
        console.error('Opt-in status error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOptInStatus();
  }, [selectedDate]);
  
  // Load weekly preferences
  React.useEffect(() => {
    const fetchWeeklyPreferences = async () => {
      try {
        const response = await fetch('/api/meals/weekly-status');
        const data = await response.json();
        
        if (response.ok) {
          setWeeklyPreferences(data.weekly_preferences);
        } else {
          setError(data.message || 'Failed to load weekly preferences');
        }
      } catch (err) {
        setError('An error occurred while loading weekly preferences');
        console.error('Weekly preferences error:', err);
      }
    };
    
    if (activeTab === 'weekly') {
      fetchWeeklyPreferences();
    }
  }, [activeTab]);
  
  // Handle meal opt-in toggle
  const handleMealOptInToggle = async (mealTypeId, optedIn) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/meals/opt-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          meal_type_id: mealTypeId,
          date: selectedDate,
          opted_in: optedIn 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update the opt-in status in the state
        setOptInStatus(prevStatus => 
          prevStatus.map(meal => 
            meal.meal_type_id === mealTypeId 
              ? { ...meal, opted_in: optedIn }
              : meal
          )
        );
        
        const mealName = mealTypes.find(m => m.id === mealTypeId)?.name || 'meal';
        setSuccess(optedIn 
          ? `You have successfully opted in for ${mealName}!` 
          : `You have opted out of ${mealName}.`);
      } else {
        setError(data.message || 'Failed to update opt-in status');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Opt-in error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle weekly preference toggle for a specific day
  const handleWeeklyToggle = async (mealTypeId, day, isChecked) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Get current preferences for this meal
      const currentPrefs = weeklyPreferences.find(wp => wp.meal_type_id === mealTypeId)?.days || {};
      
      // Update with the new toggle
      const updatedDays = {
        ...currentPrefs,
        [day]: isChecked
      };
      
      const response = await fetch('/api/meals/weekly-opt-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          meal_type_id: mealTypeId,
          days: updatedDays
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update the weekly preferences in the state
        setWeeklyPreferences(prevPrefs => 
          prevPrefs.map(pref => 
            pref.meal_type_id === mealTypeId 
              ? { ...pref, days: data.days }
              : pref
          )
        );
        
        const mealName = mealTypes.find(m => m.id === mealTypeId)?.name || 'meal';
        setSuccess(`Weekly preferences for ${mealName} updated successfully!`);
      } else {
        setError(data.message || 'Failed to update weekly preferences');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Weekly opt-in error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle "Select All" for a meal type
  const handleSelectAll = async (mealTypeId) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/meals/weekly-opt-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          meal_type_id: mealTypeId,
          days: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true
          }
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update the weekly preferences in the state
        setWeeklyPreferences(prevPrefs => 
          prevPrefs.map(pref => 
            pref.meal_type_id === mealTypeId 
              ? { ...pref, days: data.days }
              : pref
          )
        );
        
        const mealName = mealTypes.find(m => m.id === mealTypeId)?.name || 'meal';
        setSuccess(`Selected all weekdays for ${mealName}!`);
      } else {
        setError(data.message || 'Failed to update weekly preferences');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Weekly opt-in error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle daily submit
  const handleDailySubmit = () => {
    setLoading(true);
    setError(null);
    
    // We don't need to do anything special here as the toggles already update the server
    // Just set the submitted state to true
    setDailySubmitted(true);
    setSuccess("Your meal selections have been submitted successfully!");
    setLoading(false);
  };
  
  // Handle daily modify
  const handleDailyModify = () => {
    setDailySubmitted(false);
    setDailyModified(true);
    setSuccess(null);
  };
  
  // Render daily opt-in tab
  const renderDailyTab = () => {
    return (
      <div className="daily-opt-in">
        <h3 className="text-xl font-bold mb-2">Daily Meal Selection</h3>
        <p className="mb-4">
          Date: <strong>{formatDate(selectedDate)}</strong>
        </p>
        
        {!isOptInOpen && (
          <div className="status status-danger mb-4">
            ⚠️ Opt-in is currently closed for this date. Please check back during the open hours.
          </div>
        )}
        
        {dailySubmitted && !dailyModified ? (
          <div className="submitted-view">
            <div className="status status-success mb-4">
              ✅ Your meal selections have been submitted successfully!
            </div>
            <div className="meal-summary mb-4">
              <h4 className="text-lg font-bold mb-2">Your Selections:</h4>
              {optInStatus.map(meal => (
                <div key={meal.meal_type_id} className="meal-option mb-2">
                  <p>
                    {meal.name}: {meal.opted_in ? 
                      <span className="status status-success">✅ Opted In</span> : 
                      <span className="status status-danger">❌ Not Opted In</span>
                    }
                  </p>
                </div>
              ))}
            </div>
            <button 
              className="btn btn-primary"
              onClick={handleDailyModify}
              disabled={loading || !isOptInOpen}
            >
              Modify Selections
            </button>
          </div>
        ) : (
          <>
            <div className="meal-options">
              {optInStatus.map(meal => (
                <div key={meal.meal_type_id} className="meal-option mb-4 p-3 border rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-lg font-bold">{meal.name}</h4>
                      <p>
                        Status: {meal.opted_in ? 
                          <span className="status status-success">✅ Opted In</span> : 
                          <span className="status status-danger">❌ Not Opted In</span>
                        }
                      </p>
                    </div>
                    <div className="toggle-container">
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={meal.opted_in}
                          onChange={(e) => handleMealOptInToggle(meal.meal_type_id, e.target.checked)}
                          disabled={loading || !isOptInOpen}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <button 
                className="btn btn-primary"
                onClick={handleDailySubmit}
                disabled={loading || !isOptInOpen}
              >
                Submit Selections
              </button>
            </div>
          </>
        )}
      </div>
    );
  };
  
  // Handle weekly submit
  const handleWeeklySubmit = () => {
    setLoading(true);
    setError(null);
    
    // We don't need to do anything special here as the toggles already update the server
    // Just set the submitted state to true
    setWeeklySubmitted(true);
    setSuccess("Your weekly preferences have been saved successfully!");
    setLoading(false);
  };
  
  // Handle weekly modify
  const handleWeeklyModify = () => {
    setWeeklySubmitted(false);
    setWeeklyModified(true);
    setSuccess(null);
  };
  
  // Render weekly preferences tab
  const renderWeeklyTab = () => {
    return (
      <div className="weekly-preferences">
        <h3 className="text-xl font-bold mb-2">Weekly Meal Preferences</h3>
        <p className="mb-4">
          Set your default preferences for each weekday. These will be applied automatically when opt-in opens.
        </p>
        
        {weeklySubmitted && !weeklyModified ? (
          <div className="submitted-view">
            <div className="status status-success mb-4">
              ✅ Your weekly preferences have been saved successfully!
            </div>
            <div className="meal-summary mb-4">
              <h4 className="text-lg font-bold mb-2">Your Weekly Preferences:</h4>
              {weeklyPreferences.map(pref => (
                <div key={pref.meal_type_id} className="meal-weekly-summary mb-4">
                  <h5 className="font-bold">{pref.name}</h5>
                  <div className="weekday-summary grid grid-cols-5 gap-2 mt-2">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => (
                      <div key={day} className="text-center">
                        <div className="font-bold">{day.charAt(0).toUpperCase() + day.slice(1)}</div>
                        <div>{pref.days[day] ? '✅' : '❌'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button 
              className="btn btn-primary"
              onClick={handleWeeklyModify}
              disabled={loading}
            >
              Modify Preferences
            </button>
          </div>
        ) : (
          <>
            {weeklyPreferences.map(pref => (
              <div key={pref.meal_type_id} className="meal-weekly-pref mb-6 p-3 border rounded">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg font-bold">{pref.name}</h4>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => handleSelectAll(pref.meal_type_id)}
                    disabled={loading}
                  >
                    Select All Weekdays
                  </button>
                </div>
                
                <div className="weekday-toggles grid grid-cols-5 gap-2">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => (
                    <div key={day} className="weekday-toggle text-center">
                      <div className="font-bold mb-1">{day.charAt(0).toUpperCase() + day.slice(1)}</div>
                      <label className="toggle-switch mx-auto">
                        <input 
                          type="checkbox" 
                          checked={pref.days[day]}
                          onChange={(e) => handleWeeklyToggle(pref.meal_type_id, day, e.target.checked)}
                          disabled={loading}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="text-center mt-4">
              <button 
                className="btn btn-primary"
                onClick={handleWeeklySubmit}
                disabled={loading}
              >
                Submit Preferences
              </button>
            </div>
          </>
        )}
      </div>
    );
  };
  
  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4">Meal Opt-In</h2>
      
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
          Daily Selection
        </button>
        <button 
          className={`tab-btn ${activeTab === 'weekly' ? 'active' : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          Weekly Preferences
        </button>
      </div>
      
      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : (
        <>
          {activeTab === 'daily' ? renderDailyTab() : renderWeeklyTab()}
        </>
      )}
      
      <div className="mt-6">
        <h3 className="text-lg font-bold mb-2">How it works:</h3>
        <ol className="ml-4" style={{ listStyleType: 'decimal' }}>
          <li>Toggle the switches above to opt-in for meals</li>
          <li>Daily opt-in is available from 8:00 PM to 9:00 AM next day on weekdays</li>
          <li>Weekend meals (Sat/Sun) can be selected from Friday 8:00 PM to Sunday 4:00 PM</li>
          <li>Set weekly preferences to automatically opt-in for your regular meals</li>
          <li>Scan the daily QR code at the cafeteria to verify your meal selection</li>
        </ol>
      </div>
    </div>
  );
};
