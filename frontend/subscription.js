// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBaolzJALTpyVgsibfJJCTGUvadtFIF0Jw",
    authDomain: "edutec-e33bb.firebaseapp.com",
    projectId: "edutec-e33bb",
    storageBucket: "edutec-e33bb.firebasestorage.app",
    messagingSenderId: "746577664952",
    appId: "1:746577664952:web:4df2c7a9c587920a404d4d",
    measurementId: "G-JX1PMYHWZP",
    databaseURL: "https://edutec-e33bb-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// DOM elements (will be accessed after DOM is loaded)
let userFullName;
let profilePic;
let editProfile;
let logoutLink;
let planButtons;
let debugInfo;

let currentUserUid;
let userData;

// Wait for DOM to load before accessing elements
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');

    // Initialize DOM elements
    userFullName = document.getElementById('userFullName');
    profilePic = document.getElementById('profilePic');
    editProfile = document.getElementById('editProfile');
    logoutLink = document.getElementById('logoutLink');
    planButtons = document.querySelectorAll('.plan-button');
    debugInfo = document.getElementById('debugInfo');

    // Verify DOM elements
    if (!userFullName || !profilePic || !editProfile || !logoutLink || !planButtons.length || !debugInfo) {
        console.error('One or more DOM elements not found:', {
            userFullName: !!userFullName,
            profilePic: !!profilePic,
            editProfile: !!editProfile,
            logoutLink: !!logoutLink,
            planButtons: !!planButtons.length,
            debugInfo: !!debugInfo
        });
        return;
    }

    // Check auth state and get user info
    auth.onAuthStateChanged((user) => {
        console.log('Auth state changed. User:', user ? user.uid : 'No user');
        if (user) {
            currentUserUid = user.uid;
            console.log('User is signed in with UID:', currentUserUid);
            
            fetchUserDataWithRetry(currentUserUid, 3, 1000); // Retry 3 times with 1-second delay
        } else {
            console.log('No user, redirecting to signIn.html');
            window.location.href = '/SignInAndSignUpPage/signIn.html'; // Updated for static hosting
        }
    });

    // Edit profile picture functionality
    editProfile.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Edit profile clicked');
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const newPhotoURL = e.target.result;
                    profilePic.src = newPhotoURL;
                    auth.currentUser && db.ref('users/' + auth.currentUser.uid).update({
                        photoURL: newPhotoURL
                    }).then(() => console.log('Profile picture updated'));
                };
                reader.readAsDataURL(file);
            }
        };
        fileInput.click();
    });

    // Logout functionality
    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Logout clicked');
        auth.signOut()
            .then(() => {
                console.log('Sign out successful');
                window.location.href = '/SignInAndSignUpPage/signIn.html'; // Updated for static hosting
            })
            .catch((error) => {
                console.error('Sign out error:', error);
                alert('Error signing out: ' + error.message);
            });
    });

    // Navigation item active state handling
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if (this.id !== 'logoutLink') {
                e.preventDefault();
            }
            // Remove 'active' class from all items
            navItems.forEach(item => item.classList.remove('active'));
            
            // Add 'active' class to clicked item
            this.classList.add('active');
            
            const href = this.getAttribute('href');
            if (this.id !== 'logoutLink' && href && href !== '#') {
                window.location.href = href; // Relative paths for static site
            }
        });
    });
});

// Function to fetch user data with retry mechanism
function fetchUserDataWithRetry(uid, retries, delay) {
    const userRef = db.ref('users/' + uid);
    userRef.once('value')
        .then((snapshot) => {
            userData = snapshot.val();
            console.log('User data fetched:', userData);
            
            if (userData) {
                // Check if user is a student
                if (userData.role !== 'student') {
                    console.log('User is not a student, redirecting');
                    auth.signOut();
                    window.location.href = '/SignInAndSignUpPage/signIn.html';
                    return;
                }
                
                // Update user profile info
                const firstName = userData.firstName || 'User';
                const lastName = userData.lastName || '';
                const photoURL = userData.photoURL || 'https://randomuser.me/api/portraits/men/35.jpg';

                userFullName.textContent = `${firstName} ${lastName}`.trim();
                profilePic.src = photoURL;
                
                console.log('Profile updated successfully');

                // Load subscription plan after profile is updated
                loadSubscriptionPlan(userData.subscriptionPlan);
            } else {
                console.log('No user data found, using defaults');
                userFullName.textContent = 'New User';
                profilePic.src = 'https://randomuser.me/api/portraits/men/35.jpg';
                loadSubscriptionPlan(null); // Default to no plan
            }
        })
        .catch((error) => {
            console.error('Database fetch error:', error);
            if (retries > 0) {
                console.log(`Retrying fetch (${retries} attempts left)...`);
                setTimeout(() => {
                    fetchUserDataWithRetry(uid, retries - 1, delay);
                }, delay);
            } else {
                console.error('Max retries reached. Redirecting to signIn.html');
                userFullName.textContent = 'Error loading profile';
                auth.signOut();
                window.location.href = '/SignInAndSignUpPage/signIn.html';
            }
        });
}

// Load the user's subscription plan and update UI
function loadSubscriptionPlan(currentPlan) {
    console.log('Current subscription plan:', currentPlan);
    
    // Default to "Beginner" if no plan is set
    const defaultPlan = currentPlan || 'Beginner';

    // Update the UI to reflect the current plan
    planButtons.forEach(button => {
        const plan = button.getAttribute('data-plan');
        if (plan === defaultPlan) {
            button.textContent = 'Your current plan';
            button.classList.add('current');
            button.disabled = true;
        } else {
            button.textContent = 'Get Started';
            button.disabled = false;
            button.classList.remove('current');
        }

        // Add click event listener for plan selection
        button.addEventListener('click', () => {
            if (!button.disabled) {
                subscribe(plan);
            }
        });
    });
}

// Handle plan selection and trigger Adumo payment
async function subscribe(plan) {
    console.log('Plan selected for subscription:', plan);

    // Determine the amount based on the plan (using raw USD values)
    const planPrices = {
        Beginner: 50,
        Standard: 150,
        Pro: 250
    };
    const amount = planPrices[plan];

    // Populate Adumo form
    const adumoForm = document.getElementById('adumoForm');
    const merchantReference = `EDUTEC_${currentUserUid}_${Date.now()}`;
    document.getElementById('MerchantReference').value = merchantReference;
    document.getElementById('Amount').value = amount.toFixed(2);
    document.getElementById('ItemDescr1').value = `${plan} Plan Subscription`;
    document.getElementById('ItemAmount1').value = amount.toFixed(2);
    document.getElementById('Variable1').value = plan;

    try {
        const response = await fetch("https://edutec-subscription-1.onrender.com/generate-token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ plan, amount }),
        });

        const data = await response.json();

        if (data.token && data.merchantReference) {
            document.getElementById('Token').value = data.token;
            document.getElementById('MerchantReference').value = data.merchantReference;
            console.log('Token generated, submitting form...');
            adumoForm.submit();
        } else {
            alert("Error: Failed to get payment token from server.");
        }
    } catch (err) {
        console.error("Error generating token:", err);
        debugInfo.textContent = `Error: ${err.message}`;
        alert("Network error or backend unavailable.");
    }
}