/*
    Osta - Marketplace Search Functionality JavaScript
    
    Purpose: 
    - To manage user interactions on the Osta marketplace platform, including user
      authentication, account creation, item listings, and search functionality.
    - To enhance user experience by dynamically updating the webpage content without
      the need for page reloads.
    - To provide client-side logic for user actions like logging in, creating an 
      account, posting new items, viewing listings, and searching for items within 
      the marketplace.

    Author: Sherali Ozodov, Khamdam Kadirov
    Course: CSC 337
    File: client.js
*/


// It ensures that the script only runs after the entire DOM has been fully loaded.
document.addEventListener('DOMContentLoaded', function() {
  // Function to update the welcome message on the home page with the user's name.
  function updateWelcomeMessage() {
    // Fetch the username from the server's '/get-username' endpoint.
    fetch('/get-username')
      .then(response => {
        if (!response.ok) {
          throw new Error('Not authenticated');
        }
        return response.json();
      })
      .then(data => {
        // Select the element with the 'welcome' class to update the text content.
        const welcomeMessage = document.querySelector('.welcome');
        if (welcomeMessage) {
          // Set the welcome message text including the username received from the server.
          welcomeMessage.innerText = `Welcome ${data.username}! What would you like to do?`;
        }
      })
      .catch(error => {
        // If there's an error, log the error and redirect to the login page.
        console.error('Error:', error);
        window.location.href = '/index.html';
      });
  }

  if (window.location.pathname.includes('home.html')) {
    updateWelcomeMessage();
  }

  // Check if the element with id 'login-form' is present on the current page.
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    // Add an event listener to the login form that triggers when the form is submitted.
    loginForm.addEventListener('submit', function(event) {
      event.preventDefault();
      // Retrieve the username and password from the form's input fields.
      const username = document.getElementById('username-login').value;
      const password = document.getElementById('password-login').value;

      // Perform a POST request to the '/login' endpoint.
      fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'same-origin'
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // If login is successful, redirect the user to the home page.
          localStorage.setItem('sessionId', data.sessionId);
          window.location.href = '/home.html';
        } else {
          alert('Login failed: ' + data.message);
        }
      })
      .catch(error => {
        // If there's an error in the login process, log it to the console.
        console.error('Error:', error);
      });
    });
  }

// Check if the element with the id 'create-account-form' exists on the page.
const createAccountForm = document.getElementById('create-account-form');
if (createAccountForm) {
  // If the form exists, add an event listener that triggers when the form is submitted.
  createAccountForm.addEventListener('submit', function(event) {
    event.preventDefault();
    // Retrieve the values entered by the user in the form's username and password fields.
    const username = document.getElementById('username-create').value;
    const password = document.getElementById('password-create').value;

    // Perform a POST request to the '/create-account' endpoint.
    fetch('/create-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // If the account is created successfully, inform the user with an alert.
        alert('Account created successfully!');
        // Redirect the user to the login page or home page.
        window.location.href = '/index.html';
      } else {
        // If there is an error with account creation, display the error message.
        alert('Account creation failed: ' + data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
  });
}

// Ensure the script runs after the entire DOM has been fully loaded.
document.addEventListener('DOMContentLoaded', (event) => {
  // Get the item form element by its ID.
  const itemForm = document.getElementById('item-form');
  
  // Check if the item form exists on the current page.
  if (itemForm) {
    // Add a submit event listener to the item form.
    itemForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const username = getCurrentUsername();
      // Check if the user is logged in.
      if (!username) {
        alert('You must be logged in to post an item.');
        return;
      }
      // Create a FormData object from the form.
      const formData = new FormData(this);
      const sessionId = localStorage.getItem('sessionId');
      // Append sessionId to the form data if it exists.
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }

      // Send a POST request to add an item.
      fetch('/add-item', {
        method: 'POST',
        body: formData,
      })
      .then((response) => {
        // Check if the network response is successful.
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then((data) => {
        if (data) {
          // On successful post, redirect the user to home.html.
          window.location.href = '/home.html';
        } else {
          // Handle any message the server might send back, such as an error message.
          alert('Error: ' + (data.message || 'Item could not be added.'));
        }
      })
      .catch((error) => {
        // If there's an error during the fetch operation, log it to the console.
        console.error('Error:', error);
      });
    });
  }
});


// Add an event listener for the 'View your Listings' button
const viewListingsButton = document.getElementById('view-listings');
if (viewListingsButton) {
  // If the button is found, attach a click event listener to it.
  viewListingsButton.addEventListener('click', function() {
    // When clicked, send a GET request to the '/list-items' endpoint.
    fetch('/list-items')
      .then(response => {
        // If the response is not 'ok', throw an error to jump to the catch block.
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        // Pass the received data to displayListings to update the UI.
        displayListings(data);
      })
      .catch(error => {
        console.error('Error fetching listings:', error);
      });
  });
}

// Function to display listings in the 'second-part' of the webpage.
function displayListings(listings) {
  // Select the container element where listings will be displayed.
  const listingsContainer = document.querySelector('.second-part');
  if (listingsContainer) {
    listingsContainer.innerHTML = '';

    // Loop through each listing in the received array.
    listings.forEach(listing => {
      // Create a new div element to serve as the container for each listing.
      const listingDiv = document.createElement('div');
      listingDiv.className = 'listing';

      // Add a data-item-id attribute to uniquely identify the item.
      listingDiv.setAttribute('data-item-id', listing._id);

      const title = document.createElement('h3');
      title.innerText = listing.title;

      const description = document.createElement('p');
      description.innerText = `Description: ${listing.description}`;

      const price = document.createElement('p');
      price.innerText = `Price: $${listing.price}`;

      const status = document.createElement('p');
      status.innerText = listing.stat;

      // Append the title, description, price, and status elements to the listingDiv.
      listingDiv.appendChild(title);
      listingDiv.appendChild(description);
      listingDiv.appendChild(price);
      
      const buyButton = document.createElement('button');
      buyButton.innerText = 'Buy Now!';

      buyButton.addEventListener('click', () => {
        // Call the buyItem function when the button is clicked.
        buyItem(listing._id);
        buyButton.remove()
        status.innerText == 'SOLD'
      });
      listingDiv.appendChild(status)
      // Append the "Buy Now!" button to the listingDiv.
      listingDiv.appendChild(buyButton);
       // Disable the "Buy Now" button after purchase.
      if ( status.innerText == 'SOLD') {
        listingDiv.removeChild(buyButton);
        status.innerText == 'SOLD'
      }
       // Append the fully constructed listingDiv to the listingsContainer.
       listingsContainer.appendChild(listingDiv);
    });
  }
}

// Add an event listener for the 'Search Listings' button
const searchButton = document.getElementById('search');
if (searchButton) {
  // If the search button is found, attach a click event listener to it.
  searchButton.addEventListener('click', function() {
    // Retrieve the user's search term from the input field.
    const searchTerm = document.getElementById('search-listings').value;
    // Perform the fetch request to the '/search-items' endpoint with a POST method.
    fetch('/search-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: searchTerm }) 
    })
    .then(response => {
      // Check if the response status is not 'ok' to throw an error.
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      displayListings(data);
    })
    .catch(error => {
      console.error('Error fetching search results:', error);
    });
  });
}});


// Function to handle the "Buy Now!" button click
function buyItem(itemId) {
  // Get the sessionId from localStorage.
  const sessionId = localStorage.getItem('sessionId');
  console.log(sessionId)
  // Check if the user is logged in.
  if (!sessionId) {
    alert('You must be logged in to purchase items.');
    return;
  }

  // Find the item's div by its data-item-id attribute.
  const itemDiv = document.querySelector(`[data-item-id="${itemId}"]`);
  // Send a POST request to purchase the item.
  fetch('/purchase-item', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ itemId, sessionId }),
  })
  .then(response => {
    // Check if the network response is successful.
    if (!response.ok) {
      throw new Error('Purchase failed: ' + response.statusText);
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      alert('Item purchased successfully!');
      const buyButton = itemDiv.querySelector('button');
      if (buyButton) {
        // Disable the "Buy Now" button after purchase.
        buyButton.disabled = true;
        buyButton.style.display = 'none';
      }
    } else {
      alert('Purchase failed: ' + data.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Purchase failed: ' + error.message);
  });
}


// Add an event listener for the 'View Your Purchases' button
const viewPurchasesButton = document.getElementById('view-purchases');
if (viewPurchasesButton) {
  viewPurchasesButton.addEventListener('click', function () {
    // When clicked, send a GET request to the '/user-purchases' endpoint.
    fetch('/user-purchases')
      .then(response => {
        // If the response is not 'ok', throw an error to jump to the catch block.
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        // Pass the received data to displayPurchasedItems to update the UI.
        displayPurchasedItems(data);
      })
      .catch(error => {
        console.error('Error fetching purchased items:', error);
      });
  });
}

// Function to display purchased items in the 'purchased-listings' section.
function displayPurchasedItems(purchasedItems) {
  // Select the container element where purchased items will be displayed.
  const purchasedListingsContainer = document.querySelector('.second-part');
  if (purchasedListingsContainer) {
    purchasedListingsContainer.innerHTML = '';

    // Loop through each purchased item in the received array.
    purchasedItems.forEach(item => {
      // Create a new div element to serve as the container for each purchased item.
      const purchasedItemDiv = document.createElement('div');
      purchasedItemDiv.className = 'purchased-item';

      const title = document.createElement('h3');
      title.innerText = item.title;

      const description = document.createElement('p');
      description.innerText = `Description: ${item.description}`;

      const price = document.createElement('p');
      price.innerText = `Price: $${item.price}`;

      const status = document.createElement('p');
      status.innerText = item.stat;

      // Append the title, description, and price elements to the purchasedItemDiv.
      purchasedItemDiv.appendChild(title);
      purchasedItemDiv.appendChild(description);
      purchasedItemDiv.appendChild(price);
      purchasedItemDiv.appendChild(status);

      // Append the fully constructed purchasedItemDiv to the purchasedListingsContainer.
      purchasedListingsContainer.appendChild(purchasedItemDiv);
    });
  }
}


// Read the session ID from a cookie
function getSessionId() {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'sessionId') {
      return value;
    }
  }
  return null;
}

const sessionId = getSessionId();