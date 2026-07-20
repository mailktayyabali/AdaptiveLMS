import Header from "./components/Header.jsx";
import Main from "./components/Main.jsx";
import Profile from "./pages/Profile.jsx";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { ProfileProvider } from "./context/ProfileContext.jsx";

function App() {
  return (
    <Router>
      {/* Header that is always visible */}
      <Header />

      {/* Wrap the app in ProfileProvider to share user state */}
      <ProfileProvider>
        <Routes>
          {/* Home route – renders login/signup form */}
          <Route path='/' element={<Main />} />

          {/* Protected profile route */}
          <Route path='/profile' element={<Profile />} />
        </Routes>
      </ProfileProvider>
    </Router>
  );
}

export default App;