import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home.jsx';
import Vehicles from '../pages/Vehicles.jsx';
import Trajectory from '../pages/Trajectory.jsx';
import NotFound from '../pages/NotFound.jsx';

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/vehicles" element={<Vehicles />} />
      <Route path="/trajectory/:vehicleId" element={<Trajectory />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
