import Header from "./components/Header.jsx";
import Main from "./components/Main.jsx";
import Profile from "./pages/Dashboard.jsx";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

import { ProfileProvider } from "./context/ProfileContext.jsx";

function App() {
  return (
    <Router>
      <Header />
      <ProfileProvider>
        <Routes>
          <Route path='/' element={<Main />} />
          <Route path='/profile' element={<Profile />} />
        </Routes>
      </ProfileProvider>
    </Router>
  );
}

export default App;