import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, Html } from '@react-three/drei';
import * as d3 from 'd3';
import kitsData from '../data/tournament_kits_data.json';
import './index.css';

// Isolated component for the floating kit markers and axes labels
const KitPoints3D = ({ data }) => {
  const pointsRef = useRef();
  
  // 1. DUAL HIGHLIGHT STATE: Track by country string instead of specific item ID
  const [hoveredCountry, setHoveredCountry] = useState(null);

  // Structural Dimensions
  const cylinderRadius = 4;
  const cylinderHeight = 6;

  // D3 Scales
  const radiusScale = useMemo(() => d3.scaleLinear().domain([0, 1]).range([0, cylinderRadius]), []);
  const heightScale = useMemo(() => d3.scaleLinear().domain([0, 1]).range([-cylinderHeight / 2, cylinderHeight / 2]), []);

  // Compute Positions using flat Sunflower Constellation Jittering for neutrals
  const points = useMemo(() => {
    return data.map((team, index) => {
      let angle = team.metrics.hue * 2 * Math.PI;
      let r = radiusScale(team.metrics.saturation);
      let y = heightScale(team.metrics.lightness);

      // Anti-overlap for pure white/black neutrals
      if (team.metrics.saturation < 0.02) {
        const goldenAngle = index * 2.39996; 
        const spiralRadius = Math.sqrt(index + 1) * 0.12; 
        const x = spiralRadius * Math.cos(goldenAngle);
        const z = spiralRadius * Math.sin(goldenAngle);
        
        return {
          id: team.id,
          position: [x, y, z],
          color: team.colors.primary,
          label: team.country,
          kit: team.kit
        };
      }

      const x = r * Math.cos(angle);
      const z = r * Math.sin(angle);

      return {
        id: team.id,
        position: [x, y, z],
        color: team.colors.primary,
        label: team.country,
        kit: team.kit
      };
    });
  }, [data, radiusScale, heightScale]);

  // Calibrated science color stops
  const colorLabels = useMemo(() => [
    { label: 'Red', angle_deg: 0, color: '#F20A0A' },
    { label: 'Yellow', angle_deg: 52.1, color: '#ffd000' },
    { label: 'Green', angle_deg: 149.5, color: '#07BA51' },
    { label: 'Blue', angle_deg: 208.4, color: '#078DEB' }
  ], []);

  // Spin animation loop (pauses completely during isolation hover)
  useFrame((state, delta) => {
    if (pointsRef.current && hoveredCountry === null) {
      pointsRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={pointsRef}>
      {/* Structural wireframe cylinder */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[cylinderRadius, cylinderRadius, cylinderHeight, 32, 4, true]} />
        <meshBasicMaterial 
          color="#ffffff"
          wireframe 
          transparent 
          opacity={hoveredCountry ? 0.02 : 0.3}
          side={2} 
        />
      </mesh>

      {/* Central axis structural core */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, cylinderHeight, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={hoveredCountry ? 0.05 : 0.3} />
      </mesh>

      {/* Vertical Lightness Labels */}
      <Html position={[0, cylinderHeight / 2 + 0.4, 0]} sprite center distanceFactor={8}>
        <div style={{
          background: 'rgba(255,255,255,0.9)',
          color: '#000',
          fontSize: '9px',
          fontWeight: '600',
          padding: '5px 7px',
          borderRadius: '4px',
          letterSpacing: '0.08em',
          whiteSpace: 'nowrap',
          border: '1.5px solid #fff',
          opacity: hoveredCountry ? 0.2 : 1,
          boxShadow: '0 4px 10px rgba(255,255,255,0.2)'
        }}>
          Lightness: White
        </div>
      </Html>

      <Html position={[0, -cylinderHeight / 2 - 0.4, 0]} sprite center distanceFactor={8}>
        <div style={{
          background: 'rgba(0,0,0,0.85)',
          color: '#ffffff',
          fontSize: '9px',
          fontWeight: '600',
          padding: '5px 7px',
          borderRadius: '4px',
          letterSpacing: '0.08em',
          whiteSpace: 'nowrap',
          border: '1.5px solid #333',
          opacity: hoveredCountry ? 0.2 : 1,
          boxShadow: '0 -4px 10px rgba(0,0,0,0.5)'
        }}>
          Lightness: Black
        </div>
      </Html>

      {/* Horizontal Ring Color Labels */}
      {colorLabels.map(({ label, angle_deg, color }) => {
        const rad = (angle_deg * Math.PI) / 180;
        const labelX = (cylinderRadius + 0.5) * Math.cos(rad);
        const labelZ = (cylinderRadius + 0.5) * Math.sin(rad);

        return (
          <Html key={label} position={[labelX, 0, labelZ]} sprite center distanceFactor={8}>
            <div style={{
              background: 'rgba(0,0,0,0.85)',
              border: `0.5px solid ${color}`,
              color: color,
              fontSize: '10px',
              fontWeight: '600',
              padding: '5px 7px',
              borderRadius: '4px',
              letterSpacing: '0.1em',
              whiteSpace: 'nowrap',
              opacity: hoveredCountry ? 0.2 : 1,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}>
              {label}
            </div>
          </Html>
        );
      })}

      {/* Render Data Spheres */}
      {points.map((pt) => {
        // 2. ISOLATION RULES LOGIC
        const isTargetMatch = hoveredCountry === pt.label;
        const somethingIsHovered = hoveredCountry !== null;
        
        // Scale up BOTH home and away spheres matching this country name
        const sphereRadius = isTargetMatch ? 0.32 : 0.22;
        
        // Define dynamic opacity breakdown:
        // - Standard viewing = 1.0 (Full visibility)
        // - Matching pair during hover = 1.0 (Stay solid)
        // - Unrelated background nodes during hover = 0.05 (Almost invisible ghost fade)
        const dotOpacity = !somethingIsHovered || isTargetMatch ? 1.0 : 0.05;

        return (
          <mesh 
            key={pt.id} 
            position={pt.position}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredCountry(pt.label);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHoveredCountry(null);
              document.body.style.cursor = 'auto';
            }}
          >
            <sphereGeometry args={[sphereRadius, 32, 32]} />
            <meshStandardMaterial 
              color={pt.color} 
              roughness={0.3} 
              metalness={0.1}
              transparent={true} // CRITICAL: Required for ThreeJS opacity formatting to function
              opacity={dotOpacity}
            />

            {/* Hover Tooltip */}
            {isTargetMatch && (
              <Html position={[0, 0.55, 0]} center distanceFactor={8}>
                <div style={{
                  background: '#ffffff',
                  backdropFilter: 'blur(4px)',
                  color: '#000000',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  border: '1.5px solid rgba(0, 0, 0, 0.99)',
                  fontSize: '12px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  textAlign: 'center',
                  transform: 'translateY(-10px)'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>
                    {pt.label === 'Southafrica' ? 'South Africa' : pt.label}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    textTransform: 'capitalize', 
                    color: '#000000',
                  }}>
                    {pt.kit} kit
                  </div>
                </div>
              </Html>
            )}
          </mesh>
        );
      })}
    </group>
  );
};

// Main Canvas Wrapper with Integrated State Filters
export const App = () => {

  // 1. Establish visual target filtering hook states ('all', 'home', 'away')
  const [activeFilter, setActiveFilter] = useState('all');

  // 2. Filter dataset dynamically upstream before sending into ThreeJs ecosystem context
  const filteredData = useMemo(() => {
    if (activeFilter === 'all') return kitsData;
    return kitsData.filter((team) => team.kit === activeFilter);
  }, [activeFilter]);

  return (
    <div className="app-container">
      
      {/* Overlay Description (Top Left) */}
      <div style={{ position: 'absolute', top: 20, left: 20, color: '#fff', zIndex: 10, pointerEvents: 'none' }}>
        <h1 style={{ margin: '0 0 5px 0', fontSize: '17px', fontWeight: 'bold', color: '#000' }}>2026 WC Football Kit Base Colors</h1>
        <p style={{ margin: 0, color: '#ffffff', fontSize: '13px', color: '#000' }}>
          ↻ Rotation = Hue &nbsp;|&nbsp; ↕ Height = Lightness &nbsp;|&nbsp; ↔ Center Distance = Saturation <span style={{ fontSize: '9px'}}>(further from the center = higher saturation)</span>
        </p>
      </div>

      {/*Interactive Filtering Control Panel Dashboard Console */}
      <div style={{ 
        position: 'absolute', 
        top: 90, 
        left: '50%', 
        transform: `translateX(-70px)`,
        zIndex: 10,
        background: '#ffffff',
        padding: '4px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        gap: '4px',
      }}>
        {['all', 'home', 'away'].map((type) => {
          const isActive = activeFilter === type;
          return (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              style={{
                background: isActive ? '#000000' : 'transparent',
                color: isActive ? '#ffffff' : '#000000',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '400',
                textTransform: 'capitalize',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {type}
            </button>
          );
        })}
      </div>

      <div className="responsive-footer">
        <p className="footer-methodology">
          <strong>Methodology note:</strong> Colors are approximate and mapped according to their HSL values. Third kits are not included. Many kits feature complex multi-coloured patterns or gradient effects, but for simplicity and visual clarity, this visualisation strictly maps the primary base color of each kit. Data was gathered by using the eyedropper tool on official high-res supplier images, then translated into HSL coordinates with a script. The 3D visual was built with AI assistance using Three.js, React Three Fiber and D3.
        </p>
        <p><strong>Rachel Wilson</strong></p>
      </div>
     

      <Canvas camera={{ position: [0, 4, 9], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <directionalLight position={[-10, 8, -5]} intensity={0.5} />

        <Stage environment="city" intensity={0.5} adjustCamera={false}>
          {/* Inject the reactive filtered dataset subset */}
          <KitPoints3D data={filteredData} />
        </Stage>

        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          maxPolarAngle={Math.PI / 2 + 0.3}
          minDistance={3}
          maxDistance={15}
        />
      </Canvas>
    </div>
  );
};

export default App;