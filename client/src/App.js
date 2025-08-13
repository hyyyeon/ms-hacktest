// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Bookmarks from './pages/Bookmarks'; 
import MyPage from './pages/MyPage';
import './App.css';

export default function App() {
  return (
    <Router>
      {/* ✅ 모든 페이지 상단에 고정 */}
      <Navbar />

      {/* 본문 영역만 라우팅 */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bookmarks" element={<Bookmarks />} /> {/* 필요 시 */}
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<MyPage />} />

      </Routes>
    </Router>
  );
}
