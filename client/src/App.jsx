// App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import HomePage from './HomePage';
import ReportPage from './ReportPage';
import DailyTopPage from './DailyTopPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/daily-top" element={<DailyTopPage />} />
      </Route>
    </Routes>
  );
}