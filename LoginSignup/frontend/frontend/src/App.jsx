import Header from "./components/Header.jsx";
import Main from "./components/Main.jsx";
import Profile from "./pages/Dashboard.jsx";
import GithubCallback from "./pages/GithubCallback.jsx";
import DocumentList from "./pages/DocumentList.jsx";
import DocumentEditorPage from "./pages/DocumentEditorPage.jsx";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { ProfileProvider } from "./context/ProfileContext.jsx";

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <Router>
      <Header />
      <ProfileProvider>
        <Routes>
          <Route path='/' element={<Main />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/auth/github/callback' element={<GithubCallback />} />
          <Route path="/documents" element={<DocumentList />} />
          <Route path="/documents/:id" element={<DocumentEditorPage />} />
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