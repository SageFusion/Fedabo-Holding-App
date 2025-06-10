import React, { useState, useEffect, createContext, useContext } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"; // Import Timestamp

// IMPORTANT: To enable XLSX download, you must include the SheetJS library in your HTML:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
// Place this script tag in the <head> or before your React app script.
// If XLSX is not available, the download will be simulated in the console.

// Firebase config - Nicco
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const appId = process.env.REACT_APP_FIREBASE_APP_ID;

const initialAuthToken = process.env.REACT_APP_INITIAL_AUTH_TOKEN || null;

// Create a context for authentication and Firestore instances
const AppContext = createContext(null);

// Define a color palette for categories (for "I nostri luoghi" section)
const categoryColors = {
  Ristorante: "bg-blue-200 text-blue-800",
  Hotel: "bg-purple-200 text-purple-800",
  Esperienza: "bg-green-200 text-green-800",
  Eventi: "bg-yellow-200 text-yellow-800",
  default: "bg-gray-200 text-gray-800", // Fallback color
};

// Define a color palette for shop categories
const shopCategoryColors = {
  "Girzi Line": "bg-red-200 text-red-800",
  Rosarno: "bg-indigo-200 text-indigo-800",
  default: "bg-gray-200 text-gray-800", // Fallback color
};

// Helper to render star rating
const renderStars = (rating) => {
  return "⭐".repeat(rating) + "☆".repeat(5 - rating);
};

// Main Application Component
function App() {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentPage, setCurrentPage] = useState("list"); // 'submit', 'view', 'list', 'admin' for "I nostri luoghi"
  const [currentView, setCurrentView] = useState("landing"); // 'landing', 'ourPlaces', 'shop', 'shopAdmin'
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false); // State for admin login status
  const [showAdminPasswordPrompt, setShowAdminPasswordPrompt] = useState(false); // State to show/hide password prompt
  const [adminLoginMessage, setAdminLoginMessage] = useState(""); // State for admin login messages

  // State and handlers for the global location details modal (for "I nostri luoghi" section)
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const handleShowDetails = (location) => {
    setSelectedLocation(location);
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setSelectedLocation(null);
    setShowDetailsModal(false);
  };

  useEffect(() => {
    // Initialize Firebase and set up authentication listener
    const app = initializeApp(firebaseConfig);
    const firestoreDb = getFirestore(app);
    const firebaseAuth = getAuth(app);

    setDb(firestoreDb);
    setAuth(firebaseAuth);

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        // Sign in anonymously if no custom token is provided or if it fails
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(firebaseAuth, initialAuthToken);
          } else {
            await signInAnonymously(firebaseAuth);
          }
        } catch (error) {
          console.error("Errore durante l'autenticazione:", error);
          setUserId(crypto.randomUUID()); // Fallback to a random ID
        }
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe(); // Cleanup auth listener on unmount
  }, []);

  // Function to handle admin login
  const handleAdminLogin = () => {
    setAdminLoginMessage(""); // Clear previous messages
    // IMPORTANT: This is a client-side password check for demonstration ONLY.
    // DO NOT use this in a production environment. A real admin login requires
    // a secure backend authentication system.
    if (adminPasswordInput === "Admin25") {
      setIsAdminLoggedIn(true);
      setCurrentView("shopAdmin"); // Navigate to shop admin panel on successful login
      setAdminPasswordInput(""); // Clear password input
      setShowAdminPasswordPrompt(false); // Hide the password prompt
    } else {
      // Using a state-based message instead of alert
      setAdminLoginMessage("Password amministratore errata. Riprova!");
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="text-center text-gray-700 text-lg">
          Caricamento dell'applicazione...
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ db, auth, userId, isAuthReady, appId }}>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 font-sans text-gray-800 p-4 sm:p-6">
        <header className="bg-white rounded-xl shadow-lg p-4 mb-6 flex flex-col sm:flex-row justify-between items-center">
          {/* Logo di Fedabo Holding */}
          <img
            src="/uploaded/logo-orizzontale-fedabo-holding.png-4104a43a-96d5-4864-a115-3e6109d9c160"
            alt="Fedabo Holding Logo"
            className="h-16 object-contain mb-4 sm:mb-0"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                "https://placehold.co/200x50/ADD8E6/000000?text=Logo";
            }}
          />
          <nav className="flex space-x-2 sm:space-x-4 flex-wrap justify-center sm:justify-start">
            {/* Main Navigation Buttons */}
            <button
              onClick={() => {
                setCurrentView("landing");
                setShowAdminPasswordPrompt(false);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentView === "landing"
                  ? "bg-teal-700 text-white shadow-md"
                  : "bg-gray-200 text-gray-700 hover:bg-teal-100"
              }`}
            >
              Home Principale
            </button>
            {/* Conditional rendering for sub-navigation when not on landing page */}
            {(currentView === "ourPlaces" ||
              currentView === "shop" ||
              currentView === "shopAdmin") && (
              <>
                <button
                  onClick={() => {
                    setCurrentView("ourPlaces");
                    setCurrentPage("list");
                    setShowAdminPasswordPrompt(false);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentView === "ourPlaces"
                      ? "bg-teal-700 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-teal-100"
                  }`}
                >
                  I nostri luoghi
                </button>
                <button
                  onClick={() => {
                    setCurrentView("shop");
                    setShowAdminPasswordPrompt(false);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentView === "shop"
                      ? "bg-teal-700 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-teal-100"
                  }`}
                >
                  Il Negozio
                </button>
              </>
            )}
            {userId && ( // Admin button always visible if userId exists
              <button
                onClick={() => {
                  if (isAdminLoggedIn) {
                    setCurrentView("shopAdmin"); // Directly go to shop admin if already logged in
                    setShowAdminPasswordPrompt(false);
                  } else {
                    setShowAdminPasswordPrompt(true); // Show password prompt
                    setCurrentView("shopAdmin"); // Set view to shopAdmin to render prompt
                  }
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentView === "shopAdmin" && isAdminLoggedIn
                    ? "bg-teal-700 text-white shadow-md"
                    : "bg-gray-200 text-gray-700 hover:bg-teal-100"
                }`}
              >
                Admin Negozio
              </button>
            )}
          </nav>
        </header>

        <main className="bg-white rounded-xl shadow-lg p-6">
          {currentView === "landing" && (
            <LandingPage setCurrentView={setCurrentView} />
          )}

          {currentView === "ourPlaces" && (
            <>
              {/* Sub-navigation for "I nostri luoghi" section */}
              <nav className="flex space-x-2 sm:space-x-4 flex-wrap justify-center sm:justify-start mb-4">
                <button
                  onClick={() => setCurrentPage("list")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentPage === "list"
                      ? "bg-teal-700 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-teal-100"
                  }`}
                >
                  Vedi Elenco
                </button>
                <button
                  onClick={() => setCurrentPage("submit")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentPage === "submit"
                      ? "bg-teal-700 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-teal-100"
                  }`}
                >
                  Aggiungi Luogo
                </button>
                <button
                  onClick={() => setCurrentPage("view")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentPage === "view"
                      ? "bg-teal-700 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-teal-100"
                  }`}
                >
                  Vedi Mappa
                </button>
                {/* Admin button for locations, only accessible if admin is logged in */}
                {isAdminLoggedIn && (
                  <button
                    onClick={() => setCurrentPage("admin")}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      currentPage === "admin"
                        ? "bg-teal-700 text-white shadow-md"
                        : "bg-gray-200 text-gray-700 hover:bg-teal-100"
                    }`}
                  >
                    Admin Luoghi
                  </button>
                )}
              </nav>

              {/* Content for "I nostri luoghi" sub-sections */}
              {currentPage === "submit" && <SubmissionForm />}
              {currentPage === "view" && (
                <LocationDisplay onShowDetails={handleShowDetails} />
              )}
              {currentPage === "list" && (
                <LocationList onShowDetails={handleShowDetails} />
              )}
              {currentPage === "admin" && isAdminLoggedIn && <AdminPanel />}
            </>
          )}

          {currentView === "shop" && <ShopPage />}

          {currentView === "shopAdmin" && isAdminLoggedIn && <ShopAdminPanel />}
          {currentView === "shopAdmin" &&
            !isAdminLoggedIn &&
            showAdminPasswordPrompt && (
              <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg shadow-inner">
                <h2 className="text-2xl font-semibold text-teal-700 mb-4">
                  Accesso Admin Negozio
                </h2>
                <p className="text-gray-700 mb-4">
                  Inserisci la password per accedere al pannello di
                  amministrazione del negozio.
                </p>
                <input
                  type="password"
                  placeholder="Password Admin"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleAdminLogin();
                  }}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 w-full max-w-sm mb-4"
                />
                <button
                  onClick={handleAdminLogin}
                  className="px-6 py-3 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800 transition-colors duration-200 shadow-md"
                >
                  Accedi
                </button>
                {adminLoginMessage && (
                  <p className="mt-4 text-red-600 text-sm">
                    {adminLoginMessage}
                  </p>
                )}
              </div>
            )}
        </main>

        <footer className="mt-8 text-center text-gray-600 text-sm">
          <p className="mt-2">Made in Valle Camonica ❤️</p>
        </footer>

        {/* Global Modal for Location Details */}
        {showDetailsModal && selectedLocation && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
              <button
                onClick={handleCloseDetails}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl font-bold"
              >
                ×
              </button>
              <h2 className="text-3xl font-bold text-teal-700 mb-4">
                {selectedLocation.locationName}
              </h2>
              <img
                src={selectedLocation.photoUrl}
                alt={selectedLocation.locationName}
                className="w-full h-64 object-cover rounded-lg mb-4"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://placehold.co/600x400/ADD8E6/000000?text=Immagine+Non+Trovata`;
                }}
              />
              <div className="space-y-3 text-gray-700">
                <p>
                  <span className="font-semibold">Tipo:</span>{" "}
                  <span
                    className={`inline-block text-sm font-semibold px-2 py-0.5 rounded-full ${
                      categoryColors[selectedLocation.type] ||
                      categoryColors.default
                    }`}
                  >
                    {selectedLocation.type}
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Voto:</span>{" "}
                  {renderStars(selectedLocation.rating)}
                </p>
                <p>
                  <span className="font-semibold">Indirizzo:</span>{" "}
                  {selectedLocation.streetAddress}, {selectedLocation.country}
                </p>
                {selectedLocation.averagePrice && (
                  <p>
                    <span className="font-semibold">Prezzo Medio:</span> €
                    {selectedLocation.averagePrice.toFixed(2)}
                  </p>
                )}
                <p>
                  <span className="font-semibold">Descrizione:</span>{" "}
                  {selectedLocation.description}
                </p>
                <p>
                  <span className="font-semibold">Recensione:</span>{" "}
                  {selectedLocation.review}
                </p>
                {selectedLocation.instagramAccount && (
                  <p>
                    <span className="font-semibold">Instagram:</span>{" "}
                    <a
                      href={`https://instagram.com/${selectedLocation.instagramAccount.replace(
                        "@",
                        ""
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-500 hover:underline"
                    >
                      {selectedLocation.instagramAccount}
                    </a>
                  </p>
                )}
                {selectedLocation.website && (
                  <p>
                    <span className="font-semibold">Sito Web:</span>{" "}
                    <a
                      href={selectedLocation.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-500 hover:underline"
                    >
                      {selectedLocation.website}
                    </a>
                  </p>
                )}
                {selectedLocation.recommendedBy && (
                  <p>
                    <span className="font-semibold">Consigliato da:</span>{" "}
                    {selectedLocation.recommendedBy}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}

// Landing Page Component
function LandingPage({ setCurrentView }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <h1 className="text-4xl font-bold text-teal-800 mb-8 text-center">
        Cosa cerchi oggi?
      </h1>
      <div className="flex flex-col sm:flex-row space-y-6 sm:space-y-0 sm:space-x-8">
        <button
          onClick={() => setCurrentView("ourPlaces")}
          className="relative w-64 h-48 bg-white rounded-xl shadow-lg overflow-hidden transform transition-transform duration-300 hover:scale-105 group"
        >
          <img
            src="https://placehold.co/600x400/D1FAE5/065F46?text=I+nostri+luoghi"
            alt="I nostri luoghi"
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60"></div>
          <span className="relative text-white text-2xl font-semibold z-10 flex items-center justify-center h-full">
            I nostri luoghi
          </span>
        </button>
        <button
          onClick={() => setCurrentView("shop")}
          className="relative w-64 h-48 bg-white rounded-xl shadow-lg overflow-hidden transform transition-transform duration-300 hover:scale-105 group"
        >
          <img
            src="https://placehold.co/600x400/D1FAE5/065F46?text=Il+Negozio"
            alt="Il Negozio"
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60"></div>
          <span className="relative text-white text-2xl font-semibold z-10 flex items-center justify-center h-full">
            Il Negozio
          </span>
        </button>
      </div>
    </div>
  );
}

// Component for submitting new locations (for "I nostri luoghi" section)
function SubmissionForm() {
  const { db, appId } = useContext(AppContext);
  const [locationName, setLocationName] = useState("");
  const [type, setType] = useState("Ristorante"); // Default to new category
  const [description, setDescription] = useState("");
  const [review, setReview] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [rating, setRating] = useState("5");
  const [streetAddress, setStreetAddress] = useState("");
  const [country, setCountry] = useState("");
  const [instagramAccount, setInstagramAccount] = useState("");
  const [website, setWebsite] = useState("");
  const [averagePrice, setAveragePrice] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [recommendedBy, setRecommendedBy] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!db) {
      setMessage("Errore: Database non disponibile.");
      return;
    }
    setIsSubmitting(true);
    setMessage("");

    try {
      const locationsCollectionRef = collection(
        db,
        `artifacts/${appId}/public/data/locations`
      );
      await addDoc(locationsCollectionRef, {
        locationName,
        type,
        description,
        review,
        photoUrl:
          photoUrl ||
          `https://placehold.co/400x300/ADD8E6/000000?text=Immagine+Luogo`,
        rating: parseInt(rating),
        streetAddress,
        country,
        instagramAccount,
        website,
        averagePrice: parseFloat(averagePrice),
        userEmail: userEmail,
        recommendedBy,
        isApproved: false,
        timestamp: serverTimestamp(),
      });
      setMessage(
        "Luogo aggiunto con successo! Sarà visibile sulla mappa dopo l'approvazione."
      );
      setLocationName("");
      setDescription("");
      setReview("");
      setPhotoUrl("");
      setRating("5");
      setStreetAddress("");
      setCountry("");
      setInstagramAccount("");
      setWebsite("");
      setAveragePrice("");
      setUserEmail("");
      setRecommendedBy("");
    } catch (error) {
      console.error("Errore durante l'aggiunta del luogo:", error);
      setMessage("Errore durante l'aggiunta del luogo. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-2xl font-semibold text-teal-700 mb-4 sm:mb-6">
        Aggiungi un Nuovo Luogo
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="userEmail"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            La tua Email (Opzionale):
          </label>
          <input
            type="email"
            id="userEmail"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            placeholder="tua.email@esempio.com"
          />
        </div>
        <div>
          <label
            htmlFor="recommendedBy"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Consigliato da:
          </label>
          <input
            type="text"
            id="recommendedBy"
            value={recommendedBy}
            onChange={(e) => setRecommendedBy(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            placeholder="Nome o soprannome"
          />
        </div>
        <div>
          <label
            htmlFor="locationName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nome del Luogo:
          </label>
          <input
            type="text"
            id="locationName"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div>
          <label
            htmlFor="type"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Tipo di Luogo:
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="Ristorante">Ristorante</option>
            <option value="Hotel">Hotel</option>
            <option value="Esperienza">Esperienza</option>
            <option value="Eventi">Eventi</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Descrizione:
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
          ></textarea>
        </div>
        <div>
          <label
            htmlFor="review"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Recensione:
          </label>
          <textarea
            id="review"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows="3"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
          ></textarea>
        </div>
        <div>
          <label
            htmlFor="photoUrl"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            URL Foto (es. da Imgur, Flickr):
          </label>
          <input
            type="url"
            id="photoUrl"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            placeholder="https://example.com/your-image.jpg"
          />
          <p className="text-xs text-gray-500 mt-1">
            In un'applicazione reale, qui ci sarebbe un sistema di upload per le
            immagini (es. Firebase Storage).
          </p>
        </div>
        <div>
          <label
            htmlFor="rating"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Voto (1-5 Stelle):
          </label>
          <select
            id="rating"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="1">1 Stella</option>
            <option value="2">2 Stelle</option>
            <option value="3">3 Stelle</option>
            <option value="4">4 Stelle</option>
            <option value="5">5 Stelle</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="streetAddress"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Via/Indirizzo:
          </label>
          <input
            type="text"
            id="streetAddress"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div>
          <label
            htmlFor="country"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Paese:
          </label>
          <input
            type="text"
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div>
          <label
            htmlFor="instagramAccount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Account Instagram:
          </label>
          <input
            type="text"
            id="instagramAccount"
            value={instagramAccount}
            onChange={(e) => setInstagramAccount(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            placeholder="@nomeutente"
          />
        </div>
        <div>
          <label
            htmlFor="website"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Sito Web:
          </label>
          <input
            type="url"
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            placeholder="https://www.esempio.com"
          />
        </div>
        <div>
          <label
            htmlFor="averagePrice"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Prezzo Medio:
          </label>
          <input
            type="number"
            id="averagePrice"
            value={averagePrice}
            onChange={(e) => setAveragePrice(e.target.value)}
            step="0.01"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            placeholder="es. 25.50"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors duration-200 ${
            isSubmitting
              ? "bg-teal-400 cursor-not-allowed"
              : "bg-teal-700 hover:bg-teal-800 shadow-md"
          }`}
        >
          {isSubmitting ? "Invio in corso..." : "Invia Luogo"}
        </button>
        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-center ${
              message.startsWith("Errore")
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {message}
          </div>
        )}
      </form>
    </div>
  );
}

// Component to display approved locations on a "map" (list view)
function LocationDisplay({ onShowDetails }) {
  const { db, appId } = useContext(AppContext);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(""); // State for dropdown selection
  const [currentMapAddress, setCurrentMapAddress] = useState("Italia"); // State for map address

  useEffect(() => {
    if (!db) return;

    const locationsCollectionRef = collection(
      db,
      `artifacts/${appId}/public/data/locations`
    );
    // Query for approved locations
    const q = query(locationsCollectionRef, where("isApproved", "==", true));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedLocations = [];
        snapshot.forEach((doc) => {
          fetchedLocations.push({ id: doc.id, ...doc.data() });
        });
        setLocations(fetchedLocations);
        setLoading(false);

        // Update map address to the most recently approved location if available
        if (fetchedLocations.length > 0) {
          // Find the most recent approved location by timestamp (assuming it's available)
          const mostRecentApproved = fetchedLocations.sort(
            (a, b) =>
              (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0)
          )[0];
          if (
            mostRecentApproved &&
            mostRecentApproved.streetAddress &&
            mostRecentApproved.country
          ) {
            setCurrentMapAddress(
              `${mostRecentApproved.streetAddress}, ${mostRecentApproved.country}`
            );
          } else if (mostRecentApproved && mostRecentApproved.country) {
            setCurrentMapAddress(mostRecentApproved.country);
          } else {
            setCurrentMapAddress("Italia"); // Fallback
          }
        } else {
          setCurrentMapAddress("Italia"); // Default if no locations
        }
      },
      (err) => {
        console.error("Errore nel recupero dei luoghi:", err);
        setError("Impossibile caricare i luoghi. Riprova più tardi.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, appId]);

  const handleDropdownChange = (e) => {
    const id = e.target.value;
    setSelectedLocationId(id);
    const loc = locations.find((location) => location.id === id);
    if (loc) {
      onShowDetails(loc); // Open modal with selected location
      // Update map to selected location
      if (loc.streetAddress && loc.country) {
        setCurrentMapAddress(`${loc.streetAddress}, ${loc.country}`);
      } else if (loc.country) {
        setCurrentMapAddress(loc.country);
      }
    }
  };

  // Google Maps embed URL (using a placeholder for actual coordinates)
  // NOTE: This URL is a placeholder and will not render a live map without a valid Google Maps API Key
  // and proper setup for embedding. It's for demonstration of dynamic address update.
  // To display multiple pins, a full Google Maps JavaScript API integration is required,
  // which is beyond the scope of a simple iframe embed.
  const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    currentMapAddress
  )}&output=embed`;

  if (loading) {
    return (
      <div className="text-center text-gray-600 p-4">
        Caricamento luoghi approvati...
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-600 p-4">{error}</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-2xl font-semibold text-teal-700 mb-4 sm:mb-6">
        Luoghi Approvati sulla Mappa
      </h2>
      <p className="text-gray-700 mb-4">
        Questa sezione visualizza una mappa interattiva con i luoghi approvati.
        Seleziona un luogo dal menu a discesa per vederlo sulla mappa. Nota: la
        mappa incorporata può visualizzare solo un singolo indirizzo alla volta.
      </p>

      {/* Placeholder for the map */}
      <div className="w-full h-64 sm:h-80 md:h-96 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-center mb-6 border border-dashed border-gray-400">
        <iframe
          title="Google Map"
          src={googleMapsEmbedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="rounded-lg"
        ></iframe>
      </div>
      <p className="text-center text-gray-600 mt-2 text-sm">
        Mappa centrata su:{" "}
        <span className="font-medium italic">{currentMapAddress}</span>
      </p>

      {locations.length > 0 && (
        <div className="mb-6">
          <label
            htmlFor="mapLocationSelect"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Seleziona un luogo (per centrare la mappa):
          </label>
          <select
            id="mapLocationSelect"
            value={selectedLocationId}
            onChange={handleDropdownChange}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">-- Seleziona un luogo --</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.locationName} ({location.country})
              </option>
            ))}
          </select>
        </div>
      )}

      {locations.length === 0 && (
        <p className="text-center text-gray-500">
          Nessun luogo approvato al momento.
        </p>
      )}
    </div>
  );
}

// New Component: LocationList to display all locations with filtering
function LocationList({ onShowDetails }) {
  // Receive onShowDetails prop
  const { db, appId } = useContext(AppContext);
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [availableCountries, setAvailableCountries] = useState([]);

  useEffect(() => {
    if (!db) return;

    const locationsCollectionRef = collection(
      db,
      `artifacts/${appId}/public/data/locations`
    );
    const unsubscribe = onSnapshot(
      locationsCollectionRef,
      (snapshot) => {
        const fetchedLocations = [];
        const countries = new Set();
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedLocations.push({ id: doc.id, ...data });
          if (data.country) {
            countries.add(data.country);
          }
        });
        setLocations(fetchedLocations);
        setAvailableCountries(["all", ...Array.from(countries).sort()]);
        setLoading(false);
      },
      (err) => {
        console.error("Errore nel recupero di tutti i luoghi:", err);
        setError(
          "Impossibile caricare l'elenco dei luoghi. Riprova più tardi."
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, appId]);

  useEffect(() => {
    let tempFilteredLocations = locations;

    if (filterType !== "all") {
      tempFilteredLocations = tempFilteredLocations.filter(
        (loc) => loc.type === filterType
      );
    }

    if (filterCountry !== "all") {
      tempFilteredLocations = tempFilteredLocations.filter(
        (loc) => loc.country === filterCountry
      );
    }

    setFilteredLocations(tempFilteredLocations);
  }, [locations, filterType, filterCountry]);

  if (loading) {
    return (
      <div className="text-center text-gray-600 p-4">
        Caricamento elenco luoghi...
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-600 p-4">{error}</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-2xl font-semibold text-teal-700 mb-4 sm:mb-6">
        Elenco di Tutti i Luoghi
      </h2>

      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex items-center space-x-2">
          <label htmlFor="filterType" className="text-gray-700 font-medium">
            Filtra per Categoria:
          </label>
          <select
            id="filterType"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="all">Tutte le Categorie</option>
            <option value="Ristorante">Ristorante</option>
            <option value="Hotel">Hotel</option>
            <option value="Esperienza">Esperienza</option>
            <option value="Eventi">Eventi</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="filterCountry" className="text-gray-700 font-medium">
            Filtra per Paese:
          </label>
          <select
            id="filterCountry"
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
          >
            {availableCountries.map((country) => (
              <option key={country} value={country}>
                {country === "all" ? "Tutti i Paesi" : country}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredLocations.length === 0 ? (
        <p className="text-center text-gray-500">
          Nessun luogo trovato per la categoria/paese selezionato.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredLocations.map((location) => (
            <div
              key={location.id}
              className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col"
            >
              <img
                src={location.photoUrl}
                alt={location.locationName}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://placehold.co/400x300/ADD8E6/000000?text=Immagine+Non+Trovata`;
                }}
              />
              <div className="p-4 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {location.locationName}
                  </h3>
                  <span
                    className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2 ${
                      categoryColors[location.type] || categoryColors.default
                    }`}
                  >
                    {location.type}
                  </span>
                </div>
                <button
                  onClick={() => onShowDetails(location)}
                  className="mt-4 w-full py-2 px-4 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors duration-200 shadow-md"
                >
                  Dettagli
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Admin Panel Component for approving/rejecting locations
function AdminPanel() {
  const { db, appId } = useContext(AppContext);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emailSentMessage, setEmailSentMessage] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setError("Database non disponibile.");
      return;
    }

    const locationsCollectionRef = collection(
      db,
      `artifacts/${appId}/public/data/locations`
    );
    const q = query(locationsCollectionRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedLocations = [];
        snapshot.forEach((doc) => {
          fetchedLocations.push({ id: doc.id, ...doc.data() });
        });
        setLocations(fetchedLocations);
        setLoading(false);
      },
      (err) => {
        console.error("Errore nel recupero dei luoghi:", err);
        setError("Impossibile caricare i luoghi.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, appId]);

  const handleApproval = async (
    locationId,
    approve,
    userEmail,
    locationName
  ) => {
    if (!db) {
      setError("Database non disponibile.");
      return;
    }
    try {
      const locationRef = doc(
        db,
        `artifacts/${appId}/public/data/locations`,
        locationId
      );
      await updateDoc(locationRef, { isApproved: approve });

      if (approve && userEmail) {
        console.log(`Simulazione invio email a: ${userEmail}`);
        console.log(
          `Oggetto: Il tuo luogo "${locationName}" è stato approvato!`
        );
        console.log(
          `Corpo: Congratulazioni! Il tuo luogo "${locationName}" è stato approvato e ora è visibile sulla mappa.`
        );
        setEmailSentMessage(
          `Email di approvazione simulata inviata a ${userEmail} per "${locationName}".`
        );
        setTimeout(() => setEmailSentMessage(null), 5000);
      } else if (!approve && userEmail) {
        console.log(`Simulazione invio email a: ${userEmail}`);
        console.log(
          `Oggetto: Il tuo luogo "${locationName}" non è stato approvato.`
        );
        console.log(
          `Corpo: Ci dispiace, il tuo luogo "${locationName}" non è stato approvato. Contattaci per maggiori dettagli.`
        );
        setEmailSentMessage(
          `Email di rifiuto simulata inviata a ${userEmail} per "${locationName}".`
        );
        setTimeout(() => setEmailSentMessage(null), 5000);
      }
    } catch (error) {
      console.error(
        `Errore durante l'${approve ? "approvazione" : "rifiuto"} del luogo:`,
        error
      );
    }
  };

  const handleDelete = async (locationId, locationName) => {
    if (!db) {
      setError("Database non disponibile.");
      return;
    }
    // Replaced window.confirm with a console.log for demo purposes
    console.log(
      `Simulazione: Richiesta di eliminazione per "${locationName}" (ID: ${locationId}).`
    );
    // In a real app, you'd show a custom confirmation modal here.
    // For this environment, we'll proceed directly or log.
    try {
      const locationRef = doc(
        db,
        `artifacts/${appId}/public/data/locations`,
        locationId
      );
      await deleteDoc(locationRef);
      setEmailSentMessage(`Luogo "${locationName}" eliminato con successo.`);
      setTimeout(() => setEmailSentMessage(null), 5000);
    } catch (error) {
      console.error("Errore durante l'eliminazione del luogo:", error);
      setEmailSentMessage(
        `Errore durante l'eliminazione di "${locationName}".`
      );
      setTimeout(() => setEmailSentMessage(null), 5000);
    }
  };

  const handleEditClick = (location) => {
    setEditingLocation(location);
  };

  const handleCloseEditModal = () => {
    setEditingLocation(null);
  };

  const handleSaveEdit = async (updatedLocation) => {
    if (!db) {
      setError("Database non disponibile.");
      return;
    }
    try {
      const locationRef = doc(
        db,
        `artifacts/${appId}/public/data/locations`,
        updatedLocation.id
      );
      await updateDoc(locationRef, {
        locationName: updatedLocation.locationName,
        type: updatedLocation.type,
        description: updatedLocation.description,
        review: updatedLocation.review,
        photoUrl: updatedLocation.photoUrl,
        rating: parseInt(updatedLocation.rating),
        streetAddress: updatedLocation.streetAddress,
        country: updatedLocation.country,
        instagramAccount: updatedLocation.instagramAccount,
        website: updatedLocation.website,
        averagePrice: parseFloat(updatedLocation.averagePrice),
        userEmail: updatedLocation.userEmail,
        recommendedBy: updatedLocation.recommendedBy,
        isApproved: updatedLocation.isApproved,
      });
      setEmailSentMessage(
        `Luogo "${updatedLocation.locationName}" modificato con successo.`
      );
      setTimeout(() => setEmailSentMessage(null), 5000);
      setEditingLocation(null);
    } catch (error) {
      console.error("Errore durante la modifica del luogo:", error);
      setEmailSentMessage(
        `Errore durante la modifica di "${updatedLocation.locationName}".`
      );
      setTimeout(() => setEmailSentMessage(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-600 p-4">Caricamento luoghi...</div>
    );
  }

  if (error) {
    return <div className="text-center text-red-600 p-4">{error}</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-2xl font-semibold text-teal-700 mb-4 sm:mb-6">
        Pannello di Amministrazione Luoghi
      </h2>
      <p className="text-gray-700 mb-4">
        Qui puoi approvare, rifiutare, modificare o eliminare tutti i luoghi.
      </p>
      {emailSentMessage && (
        <div
          className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4"
          role="alert"
        >
          <p>{emailSentMessage}</p>
        </div>
      )}
      {locations.length === 0 ? (
        <p className="text-center text-gray-500">Nessun luogo disponibile.</p>
      ) : (
        <div className="space-y-6">
          {locations.map((location) => (
            <div
              key={location.id}
              className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex-grow">
                <h3 className="text-xl font-bold text-gray-800 mb-1">
                  {location.locationName}
                </h3>
                <p className="text-sm text-gray-600 mb-1">
                  Tipo: <span className="font-medium">{location.type}</span>
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  Descrizione: {location.description}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  Recensione: {location.review}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  Voto: {renderStars(location.rating)}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  Via: {location.streetAddress}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  Paese: {location.country}
                </p>
                {location.instagramAccount && (
                  <p className="text-sm text-gray-600 mb-1">
                    Instagram:{" "}
                    <a
                      href={`https://instagram.com/${location.instagramAccount.replace(
                        "@",
                        ""
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-500 hover:underline"
                    >
                      {location.instagramAccount}
                    </a>
                  </p>
                )}
                {location.website && (
                  <p className="text-sm text-gray-600 mb-1">
                    Sito Web:{" "}
                    <a
                      href={location.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-500 hover:underline"
                    >
                      {location.website}
                    </a>
                  </p>
                )}
                {location.averagePrice && (
                  <p className="text-sm text-gray-600 mb-1">
                    Prezzo Medio: €{location.averagePrice.toFixed(2)}
                  </p>
                )}
                {location.recommendedBy && (
                  <p className="text-sm text-gray-600 mt-2">
                    Consigliato da: {location.recommendedBy}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Email Utente: {location.userEmail}
                </p>
                <p
                  className={`text-xs font-semibold mt-1 ${
                    location.isApproved ? "text-green-600" : "text-red-600"
                  }`}
                >
                  Stato:{" "}
                  {location.isApproved
                    ? "Approvato"
                    : "In attesa di approvazione"}
                </p>
                <img
                  src={location.photoUrl}
                  alt={location.locationName}
                  className="w-32 h-24 object-cover rounded-lg mt-2"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://placehold.co/128x96/ADD8E6/000000?text=No+Img`;
                  }}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                {!location.isApproved && (
                  <button
                    onClick={() =>
                      handleApproval(
                        location.id,
                        true,
                        location.userEmail,
                        location.locationName
                      )
                    }
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 shadow-md"
                  >
                    Approva
                  </button>
                )}
                {location.isApproved && (
                  <button
                    onClick={() =>
                      handleApproval(
                        location.id,
                        false,
                        location.userEmail,
                        location.locationName
                      )
                    }
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors duration-200 shadow-md"
                  >
                    Rifiuta
                  </button>
                )}
                <button
                  onClick={() => handleEditClick(location)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 shadow-md"
                >
                  Modifica
                </button>
                <button
                  onClick={() =>
                    handleDelete(location.id, location.locationName)
                  }
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors duration-200 shadow-md"
                >
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingLocation && (
        <EditLocationModal
          location={editingLocation}
          onClose={handleCloseEditModal}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

// New component for editing a location
function EditLocationModal({ location, onClose, onSave }) {
  const [locationName, setLocationName] = useState(location.locationName);
  const [type, setType] = useState(location.type);
  const [description, setDescription] = useState(location.description);
  const [review, setReview] = useState(location.review);
  const [photoUrl, setPhotoUrl] = useState(location.photoUrl);
  const [rating, setRating] = useState(String(location.rating));
  const [streetAddress, setStreetAddress] = useState(location.streetAddress);
  const [country, setCountry] = useState(location.country);
  const [instagramAccount, setInstagramAccount] = useState(
    location.instagramAccount
  );
  const [website, setWebsite] = useState(location.website);
  const [averagePrice, setAveragePrice] = useState(
    String(location.averagePrice)
  );
  const [userEmail, setUserEmail] = useState(location.userEmail);
  const [recommendedBy, setRecommendedBy] = useState(location.recommendedBy);
  const [isApproved, setIsApproved] = useState(location.isApproved);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");

    const updatedLocation = {
      id: location.id,
      locationName,
      type,
      description,
      review,
      photoUrl,
      rating: parseInt(rating),
      streetAddress,
      country,
      instagramAccount,
      website,
      averagePrice: parseFloat(averagePrice),
      userEmail,
      recommendedBy,
      isApproved,
      timestamp: location.timestamp,
    };

    await onSave(updatedLocation);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl font-bold"
        >
          ×
        </button>
        <h2 className="text-2xl font-semibold text-teal-700 mb-4">
          Modifica Luogo: {location.locationName}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="editUserEmail"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Utente:
            </label>
            <input
              type="email"
              id="editUserEmail"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label
              htmlFor="editRecommendedBy"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Consigliato da:
            </label>
            <input
              type="text"
              id="editRecommendedBy"
              value={recommendedBy}
              onChange={(e) => setRecommendedBy(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label
              htmlFor="editLocationName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nome del Luogo:
            </label>
            <input
              type="text"
              id="editLocationName"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label
              htmlFor="editType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Tipo di Luogo:
            </label>
            <select
              id="editType"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="Ristorante">Ristorante</option>
              <option value="Hotel">Hotel</option>
              <option value="Esperienza">Esperienza</option>
              <option value="Eventi">Eventi</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="editDescription"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Descrizione:
            </label>
            <textarea
              id="editDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            ></textarea>
          </div>
          <div>
            <label
              htmlFor="editReview"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Recensione:
            </label>
            <textarea
              id="editReview"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows="3"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            ></textarea>
          </div>
          <div>
            <label
              htmlFor="editPhotoUrl"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              URL Foto:
            </label>
            <input
              type="url"
              id="editPhotoUrl"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label
              htmlFor="editRating"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Voto (1-5 Stelle):
            </label>
            <select
              id="editRating"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="1">1 Stella</option>
              <option value="2">2 Stelle</option>
              <option value="3">3 Stelle</option>
              <option value="4">4 Stelle</option>
              <option value="5">5 Stelle</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="editStreetAddress"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Via/Indirizzo:
            </label>
            <input
              type="text"
              id="editStreetAddress"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label
              htmlFor="editCountry"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Paese:
            </label>
            <input
              type="text"
              id="editCountry"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label
              htmlFor="editInstagramAccount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Account Instagram:
            </label>
            <input
              type="text"
              id="editInstagramAccount"
              value={instagramAccount}
              onChange={(e) => setInstagramAccount(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label
              htmlFor="editWebsite"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Sito Web:
            </label>
            <input
              type="url"
              id="editWebsite"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label
              htmlFor="editAveragePrice"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Prezzo Medio:
            </label>
            <input
              type="number"
              id="editAveragePrice"
              value={averagePrice}
              onChange={(e) => setAveragePrice(e.target.value)}
              step="0.01"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
              placeholder="es. 25.50"
            />
          </div>
          <div>
            <label
              htmlFor="editIsApproved"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Stato di Approvazione:
            </label>
            <select
              id="editIsApproved"
              value={isApproved ? "true" : "false"}
              onChange={(e) => setIsApproved(e.target.value === "true")}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="true">Approvato</option>
              <option value="false">In attesa di approvazione</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors duration-200 ${
                isSaving
                  ? "bg-teal-400 cursor-not-allowed"
                  : "bg-teal-700 hover:bg-teal-800 shadow-md"
              }`}
            >
              {isSaving ? "Salvataggio..." : "Salva Modifiche"}
            </button>
          </div>
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-center ${
                message.startsWith("Errore")
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// New Component: ShopPage (User-facing shop)
function ShopPage() {
  const { db, appId, userId } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]); // { productId, name, price, quantity, category }
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");

  useEffect(() => {
    if (!db) return;

    const productsCollectionRef = collection(
      db,
      `artifacts/${appId}/public/data/products`
    );
    const unsubscribe = onSnapshot(
      productsCollectionRef,
      (snapshot) => {
        const fetchedProducts = [];
        const now = Date.now();
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Filter out products that are past their availableUntil date
          // availableUntil is stored as a Firebase Timestamp, convert to JS Date for comparison
          // Products with availableUntil == null are considered always available.
          if (
            !data.availableUntil ||
            data.availableUntil.toDate().getTime() > now
          ) {
            fetchedProducts.push({ id: doc.id, ...data });
          }
        });
        setProducts(fetchedProducts);
        setLoading(false);
      },
      (err) => {
        console.error("Errore nel recupero dei prodotti:", err);
        setError("Impossibile caricare i prodotti. Riprova più tardi.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, appId]);

  const addToCart = (product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.productId === product.id
      );
      if (existingItem) {
        return prevCart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [
          ...prevCart,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
            quantity: 1,
          },
        ];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.productId !== productId)
    );
  };

  const updateQuantity = (productId, newQuantity) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(1, newQuantity) }
            : item
        )
        .filter((item) => item.quantity > 0); // Remove item if quantity drops to 0
    });
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setCheckoutMessage("Il carrello è vuoto!");
      return;
    }
    if (!customerEmail) {
      setCheckoutMessage("Inserisci la tua email per completare l'ordine.");
      return;
    }
    if (!db) {
      setCheckoutMessage("Errore: Database non disponibile.");
      return;
    }

    setCheckoutMessage("Elaborazione ordine...");
    try {
      const ordersCollectionRef = collection(
        db,
        `artifacts/${appId}/public/data/orders`
      );
      await addDoc(ordersCollectionRef, {
        items: cart,
        totalPrice: calculateTotal(),
        customerEmail,
        userId, // Anonymous user ID
        orderDate: serverTimestamp(),
      });
      setCheckoutMessage(
        "Ordine effettuato con successo! Riceverai una conferma via email (simulata)."
      );
      setCart([]);
      setCustomerEmail("");
      setTimeout(() => setShowCheckoutModal(false), 3000); // Close modal after success
    } catch (error) {
      console.error("Errore durante l'ordine:", error);
      setCheckoutMessage("Errore durante l'ordine. Riprova.");
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-600 p-4">
        Caricamento prodotti...
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-600 p-4">{error}</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-2xl font-semibold text-teal-700 mb-4 sm:mb-6">
        Negozio Fedabo
      </h2>
      <p className="text-gray-700 mb-6">
        Esplora i nostri prodotti esclusivi della linea Girzi e Rosarno.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.length === 0 ? (
          <p className="col-span-full text-center text-gray-500">
            Nessun prodotto disponibile al momento.
          </p>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200"
            >
              <img
                src={
                  product.imageUrl ||
                  `https://placehold.co/400x300/ADD8E6/000000?text=Prodotto`
                }
                alt={product.name}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://placehold.co/400x300/ADD8E6/000000?text=Immagine+Prodotto`;
                }}
              />
              <div className="p-4">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {product.name}
                </h3>
                <p className="text-gray-600 mb-2">{product.description}</p>
                <p className="text-lg font-semibold text-teal-700 mb-2">
                  €{product.price.toFixed(2)}
                </p>
                <span
                  className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    shopCategoryColors[product.category] ||
                    shopCategoryColors.default
                  } mb-2`}
                >
                  {product.category}
                </span>
                {product.availableUntil && (
                  <p className="text-sm text-gray-500">
                    Disponibile fino al:{" "}
                    {new Date(
                      product.availableUntil.toDate()
                    ).toLocaleDateString()}
                  </p>
                )}
                <button
                  onClick={() => addToCart(product)}
                  className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 shadow-md"
                >
                  Aggiungi al Carrello
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {cart.length > 0 && (
        <div className="mt-8 bg-gray-50 p-6 rounded-xl shadow-inner">
          <h3 className="text-2xl font-semibold text-teal-700 mb-4">
            Il tuo Carrello
          </h3>
          <div className="space-y-3">
            {cart.map((item) => (
              <div
                key={item.productId}
                className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100"
              >
                <div className="flex-grow">
                  <p className="font-medium">
                    {item.name}{" "}
                    <span className="text-sm text-gray-500">
                      ({item.category})
                    </span>
                  </p>
                  <p className="text-sm text-gray-700">
                    €{item.price.toFixed(2)} x {item.quantity}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity - 1)
                    }
                    className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    -
                  </button>
                  <span className="font-semibold">{item.quantity}</span>
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity + 1)
                    }
                    className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="ml-2 px-2 py-1 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                  >
                    Rimuovi
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
            <span className="text-xl font-bold text-gray-800">Totale:</span>
            <span className="text-xl font-bold text-teal-700">
              €{calculateTotal().toFixed(2)}
            </span>
          </div>
          <button
            onClick={() => setShowCheckoutModal(true)}
            className="mt-6 w-full py-3 px-4 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800 transition-colors duration-200 shadow-md"
          >
            Procedi all'Ordine
          </button>
        </div>
      )}

      {showCheckoutModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-md relative">
            <button
              onClick={() => setShowCheckoutModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl font-bold"
            >
              ×
            </button>
            <h3 className="text-2xl font-semibold text-teal-700 mb-4">
              Completa il tuo Ordine
            </h3>
            <p className="mb-4">
              Totale Ordine:{" "}
              <span className="font-bold">€{calculateTotal().toFixed(2)}</span>
            </p>
            <div className="mb-4">
              <label
                htmlFor="customerEmail"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                La tua Email:
              </label>
              <input
                type="email"
                id="customerEmail"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                placeholder="tua.email@esempio.com"
              />
            </div>
            <button
              onClick={handleCheckout}
              className="w-full py-3 px-4 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800 transition-colors duration-200 shadow-md"
            >
              Conferma Ordine
            </button>
            {checkoutMessage && (
              <p
                className={`mt-4 text-center ${
                  checkoutMessage.includes("Errore")
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {checkoutMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// New Component: ShopAdminPanel
function ShopAdminPanel() {
  const { db, appId } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [productError, setProductError] = useState(null);
  const [orderError, setOrderError] = useState(null);

  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Girzi Line");
  const [newProductImageUrl, setNewProductImageUrl] = useState("");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [newProductAvailableUntil, setNewProductAvailableUntil] = useState(""); // Date string
  const [productMessage, setProductMessage] = useState("");
  const [editingProduct, setEditingProduct] = useState(null); // State for product being edited

  // New state for filtering displayed orders
  const [displayedOrderCategory, setDisplayedOrderCategory] = useState("all");
  const [filterOrderDate, setFilterOrderDate] = useState(""); // New state for date filtering

  useEffect(() => {
    if (!db) return;

    // Fetch Products
    const productsCollectionRef = collection(
      db,
      `artifacts/${appId}/public/data/products`
    );
    const unsubscribeProducts = onSnapshot(
      productsCollectionRef,
      (snapshot) => {
        const fetchedProducts = [];
        snapshot.forEach((doc) => {
          fetchedProducts.push({ id: doc.id, ...doc.data() });
        });
        setProducts(fetchedProducts);
        setLoadingProducts(false);
      },
      (err) => {
        console.error("Errore nel recupero dei prodotti per l'admin:", err);
        setProductError("Impossibile caricare i prodotti.");
        setLoadingProducts(false);
      }
    );

    // Fetch Orders
    const ordersCollectionRef = collection(
      db,
      `artifacts/${appId}/public/data/orders`
    );
    const unsubscribeOrders = onSnapshot(
      ordersCollectionRef,
      (snapshot) => {
        const fetchedOrders = [];
        snapshot.forEach((doc) => {
          fetchedOrders.push({ id: doc.id, ...doc.data() });
        });
        setOrders(fetchedOrders);
        setLoadingOrders(false);
      },
      (err) => {
        console.error("Errore nel recupero degli ordini per l'admin:", err);
        setOrderError("Impossibile caricare gli ordini.");
        setLoadingOrders(false);
      }
    );

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, [db, appId]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!db) {
      setProductMessage("Errore: Database non disponibile.");
      return;
    }
    setProductMessage("");

    const availableUntilDate = newProductAvailableUntil
      ? new Date(newProductAvailableUntil)
      : null;
    // Check if availableUntilDate is a valid date before creating a Timestamp
    const availableUntilTimestamp =
      availableUntilDate && !isNaN(availableUntilDate.getTime())
        ? Timestamp.fromDate(availableUntilDate)
        : null;

    try {
      const productsCollectionRef = collection(
        db,
        `artifacts/${appId}/public/data/products`
      );
      await addDoc(productsCollectionRef, {
        name: newProductName,
        price: parseFloat(newProductPrice),
        category: newProductCategory,
        imageUrl:
          newProductImageUrl ||
          `https://placehold.co/400x300/ADD8E6/000000?text=Prodotto`,
        description: newProductDescription,
        availableUntil: availableUntilTimestamp, // Use the correctly formed Timestamp or null
        timestamp: serverTimestamp(),
      });
      setProductMessage("Prodotto aggiunto con successo!");
      setNewProductName("");
      setNewProductPrice("");
      setNewProductCategory("Girzi Line");
      setNewProductImageUrl("");
      setNewProductDescription("");
      setNewProductAvailableUntil("");
    } catch (error) {
      console.error("Errore durante l'aggiunta del prodotto:", error);
      setProductMessage("Errore durante l'aggiunta del prodotto. Riprova.");
    }
  };

  const handleEditProductClick = (product) => {
    setEditingProduct({
      ...product,
      // Convert Firebase Timestamp to ISO date string for input type="date"
      availableUntil: product.availableUntil
        ? new Date(product.availableUntil.toDate()).toISOString().split("T")[0]
        : "",
    });
  };

  const handleSaveProductEdit = async (e) => {
    e.preventDefault();
    if (!db || !editingProduct) {
      setProductMessage(
        "Errore: Database non disponibile o prodotto non selezionato."
      );
      return;
    }
    setProductMessage("");

    const availableUntilDate = editingProduct.availableUntil
      ? new Date(editingProduct.availableUntil)
      : null;
    // Check if availableUntilDate is a valid date before creating a Timestamp
    const availableUntilTimestamp =
      availableUntilDate && !isNaN(availableUntilDate.getTime())
        ? Timestamp.fromDate(availableUntilDate)
        : null;

    try {
      const productRef = doc(
        db,
        `artifacts/${appId}/public/data/products`,
        editingProduct.id
      );
      await updateDoc(productRef, {
        name: editingProduct.name,
        price: parseFloat(editingProduct.price),
        category: editingProduct.category,
        imageUrl:
          editingProduct.imageUrl ||
          `https://placehold.co/400x300/ADD8E6/000000?text=Prodotto`,
        description: editingProduct.description,
        availableUntil: availableUntilTimestamp, // Use the correctly formed Timestamp or null
      });
      setProductMessage("Prodotto modificato con successo!");
      setEditingProduct(null);
    } catch (error) {
      console.error("Errore durante la modifica del prodotto:", error);
      setProductMessage("Errore durante la modifica del prodotto. Riprova.");
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!db) {
      setProductMessage("Errore: Database non disponibile.");
      return;
    }
    // Replaced window.confirm with console.log for demo purposes
    console.log(
      `Simulazione: Richiesta di eliminazione per prodotto "${productName}".`
    );
    try {
      const productRef = doc(
        db,
        `artifacts/${appId}/public/data/products`,
        productId
      );
      await deleteDoc(productRef);
      setProductMessage(`Prodotto "${productName}" eliminato con successo.`);
    } catch (error) {
      console.error("Errore durante l'eliminazione del prodotto:", error);
      setProductMessage(`Errore durante l'eliminazione di "${productName}".`);
    }
  };

  const handleDownloadOrdersCSV = (category, dateFilter) => {
    let ordersToDownload = orders;

    // Apply category filter
    if (category !== "all") {
      ordersToDownload = ordersToDownload.filter((order) =>
        order.items.some((item) => item.category === category)
      );
    }

    // Apply date filter
    if (dateFilter) {
      const filterDateString = dateFilter; // YYYY-MM-DD
      ordersToDownload = ordersToDownload.filter((order) => {
        if (order.orderDate) {
          const orderDate = new Date(order.orderDate.toDate());
          const orderDateString = orderDate.toISOString().split("T")[0];
          return orderDateString === filterDateString;
        }
        return false;
      });
    }

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return "";
      const stringValue = String(value);
      // If the value contains a comma, double quote, or newline, enclose it in double quotes
      if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")
      ) {
        // Escape double quotes by doubling them
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const headers = [
      "ID Ordine",
      "Data Ordine",
      "Email Cliente",
      "Totale",
      "Nome Prodotto",
      "Categoria",
      "Prezzo Unitario",
      "Quantità",
    ];
    let csvContent = headers.map(escapeCSV).join(",") + "\n";

    ordersToDownload.forEach((order) => {
      const orderDate = order.orderDate
        ? new Date(order.orderDate.toDate()).toLocaleString()
        : "N/A";
      order.items.forEach((item) => {
        const row = [
          order.id,
          orderDate,
          order.customerEmail,
          order.totalPrice.toFixed(2),
          item.name,
          item.category,
          item.price.toFixed(2),
          item.quantity,
        ];
        csvContent += row.map(escapeCSV).join(",") + "\n";
      });
    });

    const filename = `ordini_${category === "all" ? "tutti" : category}${
      dateFilter ? `_${dateFilter}` : ""
    }.csv`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      // Feature detection for download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setProductMessage(`Download di "${filename}" in corso.`);
      setTimeout(() => setProductMessage(null), 5000);
    } else {
      console.error(
        "Il browser non supporta il download diretto. Contenuto CSV:",
        csvContent
      );
      setProductMessage(
        "Il tuo browser non supporta il download diretto di file CSV. Controlla la console per il contenuto."
      );
      setTimeout(() => setProductMessage(null), 5000);
    }
  };

  if (loadingProducts || loadingOrders) {
    return (
      <div className="text-center text-gray-600 p-4">
        Caricamento pannello amministratore negozio...
      </div>
    );
  }

  if (productError || orderError) {
    return (
      <div className="text-center text-red-600 p-4">
        {productError || orderError}
      </div>
    );
  }

  // Extract unique categories from products for order filtering
  const uniqueShopCategories = [
    "all",
    ...new Set(products.map((p) => p.category)),
  ];

  // Filter orders for display based on displayedOrderCategory and filterOrderDate
  const filteredOrdersForDisplay = orders.filter((order) => {
    const matchesCategory =
      displayedOrderCategory === "all" ||
      order.items.some((item) => item.category === displayedOrderCategory);
    const matchesDate =
      !filterOrderDate ||
      (order.orderDate &&
        new Date(order.orderDate.toDate()).toISOString().split("T")[0] ===
          filterOrderDate);
    return matchesCategory && matchesDate;
  });

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-2xl font-semibold text-teal-700 mb-4 sm:mb-6">
        Pannello di Amministrazione Negozio
      </h2>

      {productMessage && (
        <div
          className={`mb-4 p-3 rounded-lg text-center ${
            productMessage.includes("Errore")
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {productMessage}
        </div>
      )}

      {/* Product Management */}
      <div className="mb-8 p-6 bg-gray-50 rounded-xl shadow-inner">
        <h3 className="text-xl font-semibold text-teal-700 mb-4">
          {editingProduct ? "Modifica Prodotto" : "Aggiungi Nuovo Prodotto"}
        </h3>
        <form
          onSubmit={editingProduct ? handleSaveProductEdit : handleAddProduct}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="productName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nome Prodotto:
            </label>
            <input
              type="text"
              id="productName"
              value={editingProduct ? editingProduct.name : newProductName}
              onChange={(e) =>
                editingProduct
                  ? setEditingProduct({
                      ...editingProduct,
                      name: e.target.value,
                    })
                  : setNewProductName(e.target.value)
              }
              required
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label
              htmlFor="productPrice"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Prezzo:
            </label>
            <input
              type="number"
              id="productPrice"
              value={editingProduct ? editingProduct.price : newProductPrice}
              onChange={(e) =>
                editingProduct
                  ? setEditingProduct({
                      ...editingProduct,
                      price: e.target.value,
                    })
                  : setNewProductPrice(e.target.value)
              }
              step="0.01"
              required
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label
              htmlFor="productCategory"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Categoria:
            </label>
            <select
              id="productCategory"
              value={
                editingProduct ? editingProduct.category : newProductCategory
              }
              onChange={(e) =>
                editingProduct
                  ? setEditingProduct({
                      ...editingProduct,
                      category: e.target.value,
                    })
                  : setNewProductCategory(e.target.value)
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="Girzi Line">Girzi Line</option>
              <option value="Rosarno">Rosarno</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="productImageUrl"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              URL Immagine:
            </label>
            <input
              type="url"
              id="productImageUrl"
              value={
                editingProduct ? editingProduct.imageUrl : newProductImageUrl
              }
              onChange={(e) =>
                editingProduct
                  ? setEditingProduct({
                      ...editingProduct,
                      imageUrl: e.target.value,
                    })
                  : setNewProductImageUrl(e.target.value)
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
              placeholder="https://example.com/product-image.jpg"
            />
          </div>
          <div>
            <label
              htmlFor="productDescription"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Descrizione:
            </label>
            <textarea
              id="productDescription"
              value={
                editingProduct
                  ? editingProduct.description
                  : newProductDescription
              }
              onChange={(e) =>
                editingProduct
                  ? setEditingProduct({
                      ...editingProduct,
                      description: e.target.value,
                    })
                  : setNewProductDescription(e.target.value)
              }
              rows="2"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            ></textarea>
          </div>
          <div>
            <label
              htmlFor="productAvailableUntil"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Disponibile fino al (data):
            </label>
            <input
              type="date"
              id="productAvailableUntil"
              value={
                editingProduct
                  ? editingProduct.availableUntil
                  : newProductAvailableUntil
              }
              onChange={(e) =>
                editingProduct
                  ? setEditingProduct({
                      ...editingProduct,
                      availableUntil: e.target.value,
                    })
                  : setNewProductAvailableUntil(e.target.value)
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lascia vuoto per disponibilità illimitata. Se imposti una data
              passata, il prodotto non sarà visibile nel negozio.
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-6 py-3 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800 transition-colors duration-200 shadow-md"
            >
              {editingProduct
                ? "Salva Modifiche Prodotto"
                : "Aggiungi Prodotto"}
            </button>
            {editingProduct && (
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition-colors duration-200"
              >
                Annulla Modifica
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Product List */}
      <h3 className="text-xl font-semibold text-teal-700 mb-4">
        Elenco Prodotti
      </h3>
      {products.length === 0 ? (
        <p className="text-center text-gray-500 mb-8">
          Nessun prodotto nel negozio.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200"
            >
              <img
                src={
                  product.imageUrl ||
                  `https://placehold.co/400x300/ADD8E6/000000?text=Prodotto`
                }
                alt={product.name}
                className="w-full h-32 object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://placehold.co/128x96/ADD8E6/000000?text=No+Img`;
                }}
              />
              <div className="p-3">
                <h4 className="font-bold text-gray-800">{product.name}</h4>
                <p className="text-sm text-gray-600">
                  €{product.price.toFixed(2)}
                </p>
                <span
                  className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                    shopCategoryColors[product.category] ||
                    shopCategoryColors.default
                  } mt-1`}
                >
                  {product.category}
                </span>
                {product.availableUntil && (
                  <p className="text-xs text-gray-500 mt-1">
                    Disponibile fino al:{" "}
                    {new Date(
                      product.availableUntil.toDate()
                    ).toLocaleDateString()}
                  </p>
                )}
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={() => handleEditProductClick(product)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteProduct(product.id, product.name)
                    }
                    className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Management */}
      <h3 className="text-xl font-semibold text-teal-700 mb-4">
        Gestione Ordini
      </h3>
      {orders.length === 0 ? (
        <p className="text-center text-gray-500 mb-8">
          Nessun ordine ricevuto.
        </p>
      ) : (
        <div className="bg-gray-50 p-6 rounded-xl shadow-inner">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <label
                htmlFor="orderCategoryFilter"
                className="text-gray-700 font-medium"
              >
                Filtra per Categoria:
              </label>
              <select
                id="orderCategoryFilter"
                value={displayedOrderCategory} // Bind value to state
                onChange={(e) => setDisplayedOrderCategory(e.target.value)} // Update state on change
                className="p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
              >
                {uniqueShopCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "Tutte le Categorie" : cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label
                htmlFor="orderDateFilter"
                className="text-gray-700 font-medium"
              >
                Filtra per Data:
              </label>
              <input
                type="date"
                id="orderDateFilter"
                value={filterOrderDate}
                onChange={(e) => setFilterOrderDate(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
              />
              {filterOrderDate && (
                <button
                  onClick={() => setFilterOrderDate("")}
                  className="ml-2 px-3 py-1 bg-gray-300 text-gray-800 rounded-lg text-sm hover:bg-gray-400"
                >
                  Reset Data
                </button>
              )}
            </div>
            <button
              onClick={() =>
                handleDownloadOrdersCSV(displayedOrderCategory, filterOrderDate)
              } // Download based on displayed category and date
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors duration-200 shadow-md"
            >
              Scarica Ordini (CSV)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow-md">
              <thead>
                <tr className="bg-teal-100 text-teal-800 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">ID Ordine</th>
                  <th className="py-3 px-6 text-left">Data Ordine</th>
                  <th className="py-3 px-6 text-left">Email Cliente</th>
                  <th className="py-3 px-6 text-left">Totale</th>
                  <th className="py-3 px-6 text-left">Dettagli Prodotti</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 text-sm font-light">
                {filteredOrdersForDisplay.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="py-3 px-6 text-center text-gray-500"
                    >
                      Nessun ordine trovato per la categoria/data selezionata.
                    </td>
                  </tr>
                ) : (
                  filteredOrdersForDisplay.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-200 hover:bg-gray-100"
                    >
                      <td className="py-3 px-6 text-left whitespace-nowrap">
                        {order.id}
                      </td>
                      <td className="py-3 px-6 text-left">
                        {order.orderDate
                          ? new Date(order.orderDate.toDate()).toLocaleString()
                          : "N/A"}
                      </td>
                      <td className="py-3 px-6 text-left">
                        {order.customerEmail}
                      </td>
                      <td className="py-3 px-6 text-left">
                        €{order.totalPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-6 text-left">
                        {order.items &&
                          order.items.map((item, index) => (
                            <p key={index} className="text-xs">
                              {item.name} ({item.category}) x {item.quantity} -
                              €{item.price.toFixed(2)}
                            </p>
                          ))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
