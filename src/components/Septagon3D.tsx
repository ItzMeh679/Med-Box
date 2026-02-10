import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Cylinder, Html, MeshReflectorMaterial, Box, Environment, Edges } from '@react-three/drei';
import * as THREE from 'three';

const ClockContent = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeString = time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const dayString = time.toLocaleDateString('en-US', { weekday: 'long' });
    const dateString = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-4 border-cyan-400 bg-gray-900 shadow-[0_0_30px_rgba(34,211,238,0.4)]">
            <div className="text-cyan-300 font-bold font-mono text-sm uppercase tracking-widest mb-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">{dayString}</div>
            <div className="text-white font-bold text-4xl tracking-wider font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]">
                {timeString}
            </div>
            <div className="text-cyan-300 font-mono text-xs mt-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">{dateString}</div>
        </div>
    );
};

// Side Box Component
const SideBox = ({ index, radius, height, segments }: { index: number, radius: number, height: number, segments: number }) => {
    // Face i is between vertex i and i+1
    const angleStep = (Math.PI * 2) / segments;
    const faceAngle = angleStep * (index + 0.5);

    // Position on the face
    // We want it attached to the outside of the septagon
    const dist = radius + 0.2; // radius + half box depth (0.4/2 = 0.2)

    return (
        <group>
            <mesh
                rotation={[0, -faceAngle, 0]}
                position={[
                    Math.cos(faceAngle) * dist,
                    height / 2,
                    Math.sin(faceAngle) * dist
                ]}
            >
                {/* Visual Box - Aligned with Tangent (X) and Radial (Z) */}
                {/* Rotated 90 degrees as requested */}
                <group rotation={[0, Math.PI / 2, 0]}>
                    {/* Width (Tangent) = 1.5, Height = 0.8, Depth (Radial) = 0.4 */}
                    <boxGeometry args={[1.5, 0.8, 0.4]} />
                    <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />

                    {/* Connection detail - Towards the shell (local -Z of the BOX, which is global -X/Radial Inward before rotation?) */}
                    {/* After 90 deg rotation: Local Z becomes Global X (Radial). Local -Z becomes -X (Inward). */}
                    {/* So -0.22 on Z moves it Inward radially. */}
                    <mesh position={[0, 0, -0.22]}>
                        <boxGeometry args={[1.0, 0.6, 0.05]} />
                        <meshStandardMaterial color="#1e293b" />
                    </mesh>

                    {/* Glowing detail - On the "Front" Face (+X, pointing roughly towards Tray at Index 3) */}
                    <mesh position={[0.76, 0, 0]}>
                        <boxGeometry args={[0.02, 0.6, 0.3]} />
                        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} toneMapped={false} />
                    </mesh>
                </group>
            </mesh>
        </group>
    );
};

// Tray Component
const Tray = ({ index, radius, innerRadius, height, segments }: { index: number, radius: number, innerRadius: number, height: number, segments: number }) => {
    const [isOpen, setIsOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meshRef = useRef<any>();

    // Calculate face alignment
    // Face i is between vertex i and i+1
    const angleStep = (Math.PI * 2) / segments;
    const faceAngle = angleStep * (index + 0.5);

    // Dimensions
    // Length: Distance from inner cylinder to outer wall minus some clearance
    const length = radius - innerRadius - 0.4;

    // Width: Must fit at the narrowest point (innerRadius)
    // Chord length at innerRadius = 2 * innerRadius * sin(angleStep/2)
    // We make it slightly smaller (-0.1) for clearance
    const width = 2 * innerRadius * Math.sin(angleStep / 2) - 0.15;

    const trayHeight = height * 0.6; // Slightly shorter than the section

    // Positions
    // Midpoint of the tray needs to start at: innerRadius + length/2
    const startRadius = innerRadius + (length / 2) + 0.1;

    const closedDist = startRadius;
    const openDist = closedDist + 1.5; // Slide out distance

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        const targetDist = isOpen ? openDist : closedDist;

        const currentX = meshRef.current.position.x;
        const currentZ = meshRef.current.position.z;
        const currentDist = Math.sqrt(currentX * currentX + currentZ * currentZ);

        const newDist = THREE.MathUtils.lerp(currentDist, targetDist, delta * 8);

        meshRef.current.position.x = Math.cos(faceAngle) * newDist;
        meshRef.current.position.z = Math.sin(faceAngle) * newDist;
    });

    return (
        <group>
            <mesh
                ref={meshRef}
                rotation={[0, -faceAngle, 0]}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                onPointerOver={() => document.body.style.cursor = 'pointer'}
                onPointerOut={() => document.body.style.cursor = 'auto'}
                // Initial position (will be overridden by useFrame immediately, but good for SSR/first paint)
                position={[
                    Math.cos(faceAngle) * closedDist,
                    height / 2,
                    Math.sin(faceAngle) * closedDist
                ]}
            >
                {/* Main Tray Body */}
                <boxGeometry args={[length, trayHeight, width]} />
                <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.3} />

                {/* Front Plate (Face of the drawer) - Placed at +X of the local box (which points radially outward) */}
                <mesh position={[length / 2 + 0.02, 0, 0]}>
                    <boxGeometry args={[0.04, trayHeight + 0.05, width + 0.1]} />
                    <meshStandardMaterial color="#0891b2" metalness={0.9} roughness={0.2} />
                </mesh>

                {/* Handle - Glowing strip */}
                <mesh position={[length / 2 + 0.05, 0, 0]}>
                    <boxGeometry args={[0.02, trayHeight * 0.5, 0.08]} />
                    <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} toneMapped={false} />
                </mesh>

                {/* Content Area (Hollow top) */}
                {/* We simulate a hollow tray by placing a black box slightly above */}
                <mesh position={[0, 0.05, 0]}>
                    <boxGeometry args={[length - 0.1, trayHeight, width - 0.1]} />
                    <meshStandardMaterial color="#000" roughness={1} />
                </mesh>
            </mesh>
        </group>
    );
};

const SeptagonCase = () => {
    // Dimensions
    const radius = 3;
    const height = 1.5;
    const segments = 7;
    const innerRadius = 1.2;

    // Corrected rotation based on manual alignment
    const innerRotation = -0.67;

    const dividers = Array.from({ length: segments }).map((_, i) => {
        const angle = (i * Math.PI * 2) / segments;

        // Increased retraction to prevent corners from sticking out of the glass shell
        const wallLength = radius - innerRadius - 0.25;

        // Position: Center point of the divider
        const distFromCenter = innerRadius + (wallLength / 2);

        const x = Math.cos(angle) * distFromCenter;
        const z = Math.sin(angle) * distFromCenter;

        return (
            <Box
                key={i}
                args={[wallLength, height - 0.04, 0.08]}
                position={[x, height / 2, z]}
                rotation={[0, -angle, 0]}
            >
                <meshStandardMaterial color="#666" metalness={0.9} roughness={0.1} />
            </Box>
        );
    });

    return (
        // Rotating -Math.PI/2 puts Vertex 0 at +Z (Front)
        <group rotation={[0, -Math.PI / 2, 0]}>

            {/* Outer Shell - Reset rotation to 0 to provide steady baseline */}
            <Cylinder args={[radius, radius, height, segments]} position={[0, height / 2, 0]} rotation={[0, 0, 0]}>
                <meshStandardMaterial attach="material-0" color="#333" metalness={0.8} roughness={0.2} />
                <meshPhysicalMaterial
                    attach="material-1"
                    color="#aee"
                    transparent
                    opacity={0.15}
                    roughness={0}
                    metalness={0.1}
                    transmission={0.98}
                    thickness={1.5}
                    side={THREE.DoubleSide}
                />
                <meshStandardMaterial attach="material-2" color="#111" />

                {/* Edges Helper using Drei component to avoid manual geometry creation */}
                <Edges color="#22d3ee" transparent opacity={0.3} threshold={15} />
            </Cylinder>

            {/* Inner Components Group - Rotated to align dividers with corners */}
            <group rotation={[0, innerRotation, 0]}>
                {/* Inner Cylinder */}
                <Cylinder args={[innerRadius, innerRadius, height - 0.02, 32]} position={[0, height / 2 - 0.01, 0]}>
                    <meshStandardMaterial color="#222" metalness={0.5} roughness={0.5} />
                </Cylinder>

                {/* Dividers */}
                {dividers}

                {/* Interactive Tray - Placed at Face Index 3 (Visible side) */}
                <Tray index={3} radius={radius} innerRadius={innerRadius} height={height} segments={segments} />

                {/* Side Box - Connected to the right (Index 0) */}
                <SideBox index={0} radius={radius} height={height} segments={segments} />

                {/* LED Clock Interface */}
                <group position={[0, height - 0.02, 0]}>
                    <Html transform occlude position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.25} zIndexRange={[100, 0]}>
                        <ClockContent />
                    </Html>
                    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                        <ringGeometry args={[1.3, 1.45, 64]} />
                        <meshBasicMaterial color="#06b6d4" toneMapped={false} />
                    </mesh>
                </group>
            </group>

            {/* Floor - Rotated to match Outer Shell (0) */}
            <Cylinder args={[radius - 0.02, radius - 0.02, 0.02, segments]} position={[0, 0.02, 0]} rotation={[0, 0, 0]}>
                <MeshReflectorMaterial
                    blur={[400, 100]}
                    resolution={1024}
                    mixBlur={1}
                    mixStrength={20}
                    roughness={0.8}
                    depthScale={1}
                    minDepthThreshold={0.4}
                    maxDepthThreshold={1.4}
                    color="#1a1a2e"
                    metalness={0.5}
                    mirror={0.5}
                />
            </Cylinder>
        </group>
    );
};

export const Septagon3D = () => {
    return (
        <div className="w-full h-screen bg-neutral-900">
            <Canvas shadows camera={{ position: [0, 5, 5], fov: 40 }}>
                <color attach="background" args={['#111827']} />
                <Environment preset="city" />

                <ambientLight intensity={1} />
                <directionalLight position={[5, 10, 5]} intensity={2} castShadow />
                <pointLight position={[-10, 5, -10]} color="#22d3ee" intensity={2} distance={20} />

                <SeptagonCase />

                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
                    <planeGeometry args={[100, 100]} />
                    <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0.2} />
                </mesh>

                <OrbitControls minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} enablePan={false} />
            </Canvas>


        </div>
    );
};
