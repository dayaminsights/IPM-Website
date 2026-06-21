#!/usr/bin/env node
// One-time script: fetch correct India boundary TopoJSON, merge states into
// one dissolved outline, simplify with Ramer-Douglas-Peucker via @turf/simplify,
// write a compact GeoJSON for the globe (~300-500 vertices target).
// Run: node scripts/generate-india-outline.js

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const topo  = require('topojson-client');

const URL = 'https://cdn.jsdelivr.net/gh/AbhinavSwami28/India-Official-GeoJSON@main/india-states.topojson';
const OUT = path.join(__dirname, '../data/india-outline.json');

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
}

// Ramer-Douglas-Peucker line simplification
function rdp(pts, tol) {
  if (pts.length <= 2) return pts;
  const [x1,y1] = pts[0], [x2,y2] = pts[pts.length-1];
  const dx = x2-x1, dy = y2-y1, len = Math.sqrt(dx*dx+dy*dy);
  let maxD = 0, idx = 0;
  for (let i = 1; i < pts.length-1; i++) {
    const d = len < 1e-10
      ? Math.hypot(pts[i][0]-x1, pts[i][1]-y1)
      : Math.abs(dy*pts[i][0] - dx*pts[i][1] + x2*y1 - y2*x1) / len;
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= tol) return [pts[0], pts[pts.length-1]];
  return [...rdp(pts.slice(0, idx+1), tol), ...rdp(pts.slice(idx), tol).slice(1)];
}

function simplifyRing(ring, tol) {
  const s = rdp(ring, tol);
  // Ensure ring closes and has at least 4 points
  if (s.length < 4) return null;
  if (s[0][0] !== s[s.length-1][0] || s[0][1] !== s[s.length-1][1]) s.push(s[0]);
  return s;
}

function simplifyGeom(geom, tol) {
  if (geom.type === 'Polygon') {
    const rings = geom.coordinates.map(r => simplifyRing(r, tol)).filter(Boolean);
    return rings.length ? { type: 'Polygon', coordinates: rings } : null;
  }
  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates
      .map(poly => poly.map(r => simplifyRing(r, tol)).filter(Boolean))
      .filter(poly => poly.length > 0);
    return polys.length ? { type: 'MultiPolygon', coordinates: polys } : null;
  }
  return geom;
}

function countVerts(geom) {
  let v = 0;
  const walk = c => { if (Array.isArray(c[0])) c.forEach(walk); else v++; };
  walk(geom.coordinates);
  return v;
}

(async () => {
  console.log('Fetching India TopoJSON...');
  const topology = await get(URL);

  const merged = topo.merge(topology, topology.objects.data.geometries);
  console.log('Before simplify:', countVerts(merged), 'vertices');

  // tolerance in degrees — 0.1° ≈ 11km, appropriate for a world-globe view
  const simplified = simplifyGeom(merged, 0.1);
  console.log('After simplify (tol=0.1°):', countVerts(simplified), 'vertices');

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(simplified));
  const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
  console.log(`Written → ${OUT} (${kb} KB)`);
})();
