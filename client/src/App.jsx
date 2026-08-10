import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import HomePage from './HomePage';
import ReportPage from './ReportPage';
import DailyTopPage from './DailyTopPage';
import ModelStatusPage from './ModelStatusPage';
import CheckpointMapPage from './CheckpointMapPage';
import SgpAuditPage from './SgpAuditPage';
import MppWeeklyTopPage from './MppWeeklyTopPage';
import PartDefectSearchPage from './PartDefectSearchPage';
import DrrReportPage from './DrrReportPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/daily-top" element={<DailyTopPage />} />
        <Route path="/model-status" element={<ModelStatusPage />} />
        <Route path="/checkpoint-map" element={<CheckpointMapPage />} />
        <Route path="/sgp-audit" element={<SgpAuditPage />} />
        <Route path="/mpp-weekly-top" element={<MppWeeklyTopPage />} />
        <Route path="/part-defect-search" element={<PartDefectSearchPage />} />
        <Route path="/drr-report" element={<DrrReportPage />} />
      </Route>
    </Routes>
  );
}