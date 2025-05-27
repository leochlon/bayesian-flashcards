// Test for Settings component
console.log('Testing Settings component');

// Mock hyperInfo and settings data
const hyperInfo = {
  bayesian: {
    prior_alpha: {
      description: 'Beta distribution prior for successes (higher = optimistic)',
      type: 'float',
      default: 1.0,
      min: 0.1,
      max: 10.0
    },
    prior_beta: {
      description: 'Beta distribution prior for failures (higher = pessimistic)',
      type: 'float',
      default: 1.0,
      min: 0.1,
      max: 10.0
    }
  },
  scheduler: {
    backlog_limit: {
      description: 'Maximum number of urgent cards to review',
      type: 'integer',
      default: 50,
      min: 10,
      max: 200
    }
  },
  experience: {
    pomodoro_length: {
      description: 'Study session length in minutes',
      type: 'integer',
      default: 25,
      min: 5,
      max: 60
    }
  }
};

// Test case 1: Both hyperInfo and settings are defined
console.log('Test case 1: Both hyperInfo and settings are defined');
const settings = {
  prior_alpha: 2.0,
  backlog_limit: 30
};

// Testing our replacement code
if (hyperInfo?.bayesian) {
  Object.keys(hyperInfo.bayesian).forEach(key => {
    const info = hyperInfo.bayesian[key];
    const currentValue = settings && key in settings ? settings[key] : info.default;
    console.log(`Key: ${key}, Value: ${currentValue}`);
  });
}

// Test case 2: Settings is null
console.log('\nTest case 2: Settings is null');
const nullSettings = null;

if (hyperInfo?.bayesian) {
  Object.keys(hyperInfo.bayesian).forEach(key => {
    const info = hyperInfo.bayesian[key];
    const currentValue = nullSettings && key in nullSettings ? nullSettings[key] : info.default;
    console.log(`Key: ${key}, Value: ${currentValue}`);
  });
}

// Test case 3: HyperInfo is null
console.log('\nTest case 3: HyperInfo is null');
const nullHyperInfo = null;

if (nullHyperInfo?.bayesian) {
  console.log('This should not be printed');
  Object.keys(nullHyperInfo.bayesian).forEach(key => {
    const info = nullHyperInfo.bayesian[key];
    const currentValue = settings && key in settings ? settings[key] : info.default;
    console.log(`Key: ${key}, Value: ${currentValue}`);
  });
} else {
  console.log('Correctly handled null hyperInfo');
}

console.log('\nTests completed successfully');
