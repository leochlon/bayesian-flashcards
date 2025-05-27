const test = () => {
  // Mock hyperInfo and settings data
  const hyperInfo = {
    bayesian: {
      prior_alpha: {
        description: 'Test',
        type: 'float',
        default: 1.0,
        min: 0.1,
        max: 10.0
      }
    }
  };
  
  // Test with null settings
  const settings = null;
  
  // Test accessing properties safely
  const result = hyperInfo?.bayesian && Object.keys(hyperInfo.bayesian).map(key => {
    const info = hyperInfo.bayesian[key];
    const currentValue = settings && key in settings ? settings[key] : info.default;
    return { key, value: currentValue };
  });
  
  console.log(result);
};

test();
