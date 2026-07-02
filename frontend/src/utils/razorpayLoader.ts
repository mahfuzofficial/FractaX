export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // 1. If Razorpay is already loaded on the page, don't download it again
    if (window.hasOwnProperty('Razorpay')) {
      resolve(true);
      return;
    }

    // 2. Otherwise, create an HTML script tag dynamically
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    
    // 3. If it loads successfully, return true
    script.onload = () => {
      resolve(true);
    };

    // 4. If something goes wrong (like no internet network), return false
    script.onerror = () => {
      resolve(false);
    };

    // Append the script element to the webpage body document
    document.body.appendChild(script);
  });
};