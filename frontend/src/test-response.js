// Test script to verify response handling
export const testResponseHandling = async () => {
  try {
    console.log('Testing response handling...');
    
    // Simulate a fetch request
    const response = await fetch('https://realgiveaways.com/api.php/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    
    // Check if response is ok
    // Handle response properly to avoid "Response body is already used" error
    const responseClone = response.clone();
    const responseText = await response.text();
    const resClone = new Response(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
    
    if (!response.ok) {
      const errorText = await resClone.text();
      console.log('Error text:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    // Parse JSON response from the clone
    const data = await resClone.json();
    console.log('Success data:', data);
    
    return data;
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
};

// Run the test if this file is executed directly
if (typeof window !== 'undefined' && window.location.search.includes('test')) {
  testResponseHandling().then(result => {
    console.log('Test completed successfully:', result);
  }).catch(error => {
    console.error('Test failed:', error);
  });
}