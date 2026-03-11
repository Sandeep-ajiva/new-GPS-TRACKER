module.exports = {
  // Server Configuration
  TCP_HOST: 'localhost',
  TCP_PORT: 6000,
  
  // Simulation Settings
  SEND_INTERVAL: 5000, // 5 seconds between GPS updates
  LOGIN_RETRY_DELAY: 2000, // 2 seconds between login attempts
  
  // Vehicle Behavior
  SPEED_VARIATION: 10, // ±10 km/h speed variation
  STOP_PROBABILITY: 0.1, // 10% chance to stop at each point
  IDLE_TIME: 30000, // 30 seconds idle time when stopped
  
  // Route Settings
  ROUTE_LOOP: true, // Loop routes continuously
  ROUTE_COMPLETION_DELAY: 5000, // 5 seconds delay before restarting route
  
  // Logging
  ENABLE_CONSOLE_LOG: true,
  ENABLE_DEBUG_LOG: false
};
