import Header from "./components/Header.jsx";
import Main from "./components/Main.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import GithubCallback from "./pages/GithubCallback.jsx";
import CourseListPage from "./pages/CourseListPage.jsx";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { ProfileProvider } from "./context/ProfileContext.jsx";

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <Router>
      <ProfileProvider>
        <Header />
        <Routes>
          <Route path='/' element={<Main />} />
          <Route path='/profile' element={<UserProfile />} />
          <Route path='/admin/dashboard' element={<Dashboard />} />
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/auth/github/callback' element={<GithubCallback />} />
          <Route path="/courses" element={<CourseListPage />} />
        </Routes>
      </ProfileProvider>
      <ToastContainer
      position="top-center"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="dark"
      />
    </Router>
  );
}

export default App;