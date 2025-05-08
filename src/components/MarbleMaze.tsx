
import { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Environment, Stars, useTexture } from '@react-three/drei';
import { Physics, useBox, usePlane, useSphere } from '@react-three/cannon';
import { Vector3, Mesh, MeshStandardMaterial } from 'three';
import { useKeyboardControls } from '../hooks/useKeyboardControls';

const BOARD_SIZE = 10;
const WALL_HEIGHT = 0.5;
const HOLE_RADIUS = 0.4;
const BALL_RADIUS = 0.3;

const Plane = () => {
  const [ref] = usePlane(() => ({ 
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -0.1, 0] 
  }));
  
  // Use a simpler approach for textures instead of external URLs
  return (
    <mesh ref={ref as any} receiveShadow>
      <planeGeometry args={[BOARD_SIZE, BOARD_SIZE]} />
      <meshStandardMaterial 
        color="#8B5CF6" 
        metalness={0.2} 
        roughness={0.1}
      />
    </mesh>
  );
};

const Wall = ({ position, size }: { position: [number, number, number], size: [number, number, number] }) => {
  const [ref] = useBox(() => ({ 
    position,
    args: size,
    type: 'Static'
  }));

  return (
    <mesh ref={ref as any} position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial 
        color="#D946EF" 
        metalness={0.3} 
        roughness={0.2}
        emissive="#9333EA"
        emissiveIntensity={0.2}
      />
    </mesh>
  );
};

const Hole = ({ position }: { position: [number, number, number] }) => {
  // Glowing effect for holes
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[HOLE_RADIUS, 32]} />
        <meshStandardMaterial 
          color="#0EA5E9" 
          emissive="#0EA5E9"
          emissiveIntensity={0.8}
          metalness={0.9} 
          roughness={0.1} 
        />
      </mesh>
      
      {/* Glow effect */}
      <pointLight 
        position={[0, 0.1, 0]} 
        intensity={2} 
        distance={1.5} 
        color="#0EA5E9" 
      />
    </group>
  );
};

const Ball = ({ position, onFall }: { position: [number, number, number], onFall: () => void }) => {
  const [ref, api] = useSphere(() => ({
    mass: 1,
    position,
    args: [BALL_RADIUS],
    onCollide: (e) => {
      // Convert number[] to Vector3
      const contactNormal = new Vector3(
        e.contact.contactNormal[0], 
        e.contact.contactNormal[1], 
        e.contact.contactNormal[2]
      );
      checkHoleCollision(contactNormal);
    }
  }));

  const controls = useKeyboardControls();
  const velocity = useRef<Vector3>(new Vector3(0, 0, 0));
  const ballPosition = useRef<[number, number, number]>([0, 0, 0]);

  // Track ball position
  useEffect(() => {
    const unsubscribe = api.position.subscribe(v => {
      ballPosition.current = [v[0], v[1], v[2]];
      // Check if ball fell through a hole
      if (v[1] < -2) {
        onFall();
        api.position.set(position[0], position[1], position[2]);
        api.velocity.set(0, 0, 0);
      }
    });

    return unsubscribe;
  }, [api, onFall, position]);

  // Handle keyboard movement
  useEffect(() => {
    const force = 3;
    let intervalId: NodeJS.Timeout;

    if (Object.values(controls).some(Boolean)) {
      intervalId = setInterval(() => {
        let [x, y, z] = [0, 0, 0];

        if (controls.up) z -= force;
        if (controls.down) z += force;
        if (controls.left) x -= force;
        if (controls.right) x += force;

        api.applyForce([x, y, z], [0, 0, 0]);
      }, 16);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [controls, api]);

  // Check if ball is over a hole
  const checkHoleCollision = (normal: Vector3) => {
    // If ball is on a surface and the normal is pointing up
    if (Math.abs(normal.y) > 0.9) {
      holes.forEach(hole => {
        const dx = ballPosition.current[0] - hole[0];
        const dz = ballPosition.current[2] - hole[1];
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < HOLE_RADIUS - BALL_RADIUS / 2) {
          // Ball is over a hole, remove constraints to let it fall
          api.mass.set(1);
          api.velocity.set(0, -5, 0);
        }
      });
    }
  };

  return (
    <group>
      <mesh ref={ref as any} castShadow receiveShadow>
        <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
        <meshStandardMaterial 
          color="#e0e0e0" 
          metalness={0.9} 
          roughness={0.1}
          envMapIntensity={1}
        />
      </mesh>
      {/* Add subtle point light to create a glow effect around the ball */}
      <pointLight 
        position={[0, 0.1, 0]} 
        intensity={0.8} 
        distance={2} 
        color="#ffffff" 
      />
    </group>
  );
};

// Visual enhancement: environment decorations
const EnvironmentDecoration = () => {
  return (
    <>
      {/* Add stars in the background */}
      <Stars 
        radius={100} 
        depth={50} 
        count={5000} 
        factor={4} 
        saturation={0} 
        fade 
        speed={1} 
      />
      
      {/* Ambient particles floating around */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh 
          key={i} 
          position={[
            (Math.random() - 0.5) * 20,
            Math.random() * 10 + 5,
            (Math.random() - 0.5) * 20
          ]}
        >
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial 
            color="#F97316" 
            emissive="#F97316"
            emissiveIntensity={1} 
            transparent 
            opacity={0.7} 
          />
        </mesh>
      ))}
    </>
  );
};

// Define maze layout
const walls = [
  // Outer walls
  { position: [-BOARD_SIZE/2, WALL_HEIGHT/2, 0] as [number, number, number], size: [0.2, WALL_HEIGHT, BOARD_SIZE] as [number, number, number] }, // Left
  { position: [BOARD_SIZE/2, WALL_HEIGHT/2, 0] as [number, number, number], size: [0.2, WALL_HEIGHT, BOARD_SIZE] as [number, number, number] },  // Right
  { position: [0, WALL_HEIGHT/2, -BOARD_SIZE/2] as [number, number, number], size: [BOARD_SIZE, WALL_HEIGHT, 0.2] as [number, number, number] }, // Top
  { position: [0, WALL_HEIGHT/2, BOARD_SIZE/2] as [number, number, number], size: [BOARD_SIZE, WALL_HEIGHT, 0.2] as [number, number, number] },  // Bottom
  
  // Inner maze walls
  { position: [-2, WALL_HEIGHT/2, -2] as [number, number, number], size: [4, WALL_HEIGHT, 0.2] as [number, number, number] },
  { position: [2, WALL_HEIGHT/2, -1] as [number, number, number], size: [4, WALL_HEIGHT, 0.2] as [number, number, number] },
  { position: [-2, WALL_HEIGHT/2, 0] as [number, number, number], size: [0.2, WALL_HEIGHT, 4] as [number, number, number] },
  { position: [0, WALL_HEIGHT/2, 2] as [number, number, number], size: [4, WALL_HEIGHT, 0.2] as [number, number, number] },
  { position: [3, WALL_HEIGHT/2, -3] as [number, number, number], size: [0.2, WALL_HEIGHT, 4] as [number, number, number] },
  { position: [-3, WALL_HEIGHT/2, 3] as [number, number, number], size: [0.2, WALL_HEIGHT, 4] as [number, number, number] },
];

// Define holes
const holes: [number, number][] = [
  [-3, -3],  // [x, z] coordinates
  [3, 0],
  [0, 3],
  [4, -4],
];

// Starting position for the ball
const startPosition: [number, number, number] = [4, 0.3, 4];

const MarbleMaze = () => {
  const [gameOver, setGameOver] = useState(false);
  
  const handleFall = () => {
    setGameOver(true);
    setTimeout(() => setGameOver(false), 2000);
  };

  return (
    <div className="relative w-full h-screen">
      <div className="absolute top-4 left-0 right-0 text-center z-10">
        <h1 className="text-3xl font-bold text-white drop-shadow-lg">Marble Maze</h1>
        <p className="text-white drop-shadow-md">Use arrow keys to move the marble. Don't fall in the holes!</p>
      </div>
      
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-800 p-8 rounded-lg shadow-xl text-center border border-purple-300">
            <h2 className="text-2xl font-bold mb-4 text-white">Game Over!</h2>
            <p className="text-purple-100">Your marble fell through a hole.</p>
          </div>
        </div>
      )}

      <Canvas 
        shadows 
        camera={{ position: [0, 10, 10], fov: 50 }}
        gl={{ antialias: true }}
      >
        {/* Enhanced lighting setup */}
        <ambientLight intensity={0.4} />
        <pointLight position={[-10, 10, -10]} intensity={0.5} castShadow />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        <directionalLight 
          position={[5, 8, 5]} 
          intensity={0.8} 
          castShadow 
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024}
        />
        
        {/* Environment and decorations */}
        <Environment preset="sunset" />
        <EnvironmentDecoration />
        
        <Physics gravity={[0, -9.81, 0]}>
          <Plane />
          {walls.map((wall, i) => (
            <Wall 
              key={i} 
              position={wall.position} 
              size={wall.size} 
            />
          ))}
          {holes.map((hole, i) => (
            <Hole 
              key={i} 
              position={[hole[0], 0, hole[1]]} 
            />
          ))}
          <Ball 
            position={startPosition} 
            onFall={handleFall} 
          />
        </Physics>
        <OrbitControls 
          enableRotate={true} 
          enablePan={false} 
          enableZoom={true} 
          maxPolarAngle={Math.PI / 2.5} 
          minPolarAngle={Math.PI / 6}
        />
      </Canvas>
      
      {/* Add a nice gradient background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-purple-900 via-indigo-800 to-blue-900" />
    </div>
  );
};

export default MarbleMaze;
