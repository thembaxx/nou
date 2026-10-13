/* oxlint-disable react/immutability -- Three.js scene and renderer are imperative external objects managed by React Three Fiber. */
"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, Component, memo, type ReactNode } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { skyKind } from "@/lib/weather";

class SkyBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function SkyFallback({ night = false }: { night?: boolean }) {
  return (
    <svg className="sky-fallback" viewBox="0 0 400 280" aria-hidden="true">
      <defs>
        <radialGradient id="cloud">
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#cbd4d3" />
        </radialGradient>
        <radialGradient id="sun">
          <stop stopColor={night ? "#e8eddf" : "#ffffb1"} />
          <stop offset="1" stopColor={night ? "#9caeae" : "#f0df69"} />
        </radialGradient>
        <filter id="shadow">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <ellipse
        cx="213"
        cy="239"
        rx="90"
        ry="10"
        fill="#718081"
        opacity=".16"
        filter="url(#shadow)"
      />
      <circle cx="259" cy="102" r="66" fill="url(#sun)" />
      <path
        d="M107 204c-32 0-44-21-40-40 3-19 20-30 40-28 3-32 27-55 59-55 29 0 50 17 56 42 24-9 48 5 51 28 28-4 48 9 49 28 1 17-12 25-34 25Z"
        fill="url(#cloud)"
      />
    </svg>
  );
}

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = generator.fromScene(room, 0.04);
    scene.environment = env.texture;
    return () => {
      scene.environment = null;
      env.dispose();
      room.dispose();
      generator.dispose();
    };
  }, [gl, scene]);
  return null;
}

function CameraFit() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    camera.position.z = size.width / size.height > 1.35 ? 7.3 : 9.5;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  return null;
}

const CLOUDS = [
  { position: [-1.35, -0.35, 0.2], scale: [0.9, 0.64, 0.74] },
  { position: [-0.72, 0.1, 0.03], scale: [0.95, 0.97, 0.9] },
  { position: [0.12, -0.04, 0.12], scale: [0.96, 0.77, 0.82] },
  { position: [0.89, -0.38, 0.24], scale: [0.73, 0.54, 0.65] },
  { position: [-0.42, -0.46, 0.38], scale: [1.27, 0.53, 0.85] },
];

function WeatherObject({
  kind,
  night,
  pointer,
  reduced,
}: {
  kind: ReturnType<typeof skyKind>;
  night: boolean;
  pointer: React.RefObject<{ x: number; y: number; pressed: boolean }>;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const sun = useRef<THREE.Mesh>(null);
  const drops = useRef<THREE.Group>(null);
  const stars = useRef<THREE.Group>(null);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const t = reduced ? 0 : clock.elapsedTime;
    group.current.position.y = Math.sin(t * 0.75) * 0.085;
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      pointer.current.x * 0.35,
      4,
      delta,
    );
    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      pointer.current.y * 0.13,
      4,
      delta,
    );
    const size = pointer.current.pressed ? 1.075 : 1;
    group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, size, 7, delta));
    if (sun.current) sun.current.rotation.z = t * 0.05;
    if (stars.current) stars.current.rotation.y = Math.sin(t * 0.2) * 0.08;
    if (drops.current)
      drops.current.children.forEach((drop, i) => {
        drop.position.y = -1.05 - ((t * 0.9 + i * 0.19) % 0.8);
      });
  });
  const showCloud = kind !== "clear";
  return (
    <group ref={group} rotation={[0.06, -0.18, -0.08]}>
      {night ? (
        <group
          position={[showCloud ? 0.9 : 0.1, showCloud ? 0.72 : 0.2, -0.6]}
          rotation={[0, 0, -0.45]}
        >
          <mesh ref={sun}>
            <torusGeometry args={[0.72, 0.25, 24, 72, Math.PI * 1.55]} />
            <meshPhysicalMaterial color="#e6edde" roughness={0.2} metalness={0.12} clearcoat={1} />
          </mesh>
          <group ref={stars}>
            {[
              [-1.4, 0.8, 0],
              [1.55, 0.4, 0.3],
              [1.1, -1.1, 0.2],
            ].map((p, i) => (
              <mesh key={i} position={p as [number, number, number]} rotation={[0, 0, Math.PI / 4]}>
                <octahedronGeometry args={[i === 0 ? 0.11 : 0.065]} />
                <meshStandardMaterial color="#eff5d8" emissive="#c6d29a" emissiveIntensity={0.3} />
              </mesh>
            ))}
          </group>
        </group>
      ) : (
        <mesh ref={sun} position={[showCloud ? 0.75 : 0, showCloud ? 0.63 : 0, -0.55]}>
          <sphereGeometry args={[showCloud ? 1.05 : 1.25, 64, 48]} />
          <meshPhysicalMaterial
            color="#e5df61"
            roughness={0.21}
            metalness={0.07}
            clearcoat={1}
            clearcoatRoughness={0.12}
          />
        </mesh>
      )}
      {showCloud && (
        <group position={[0, -0.2, 0.15]} scale={1.02}>
          {CLOUDS.map((c, i) => (
            <mesh
              key={i}
              position={c.position as [number, number, number]}
              scale={c.scale as [number, number, number]}
              castShadow
              receiveShadow
            >
              <sphereGeometry args={[1, 48, 32]} />
              <meshPhysicalMaterial
                color={kind === "storm" ? "#abb7bd" : night ? "#c8d5d9" : "#f2f5f2"}
                roughness={0.27}
                metalness={0.03}
                clearcoat={0.85}
                clearcoatRoughness={0.18}
              />
            </mesh>
          ))}
        </group>
      )}
      {(kind === "rain" || kind === "storm" || kind === "snow") && (
        <group ref={drops}>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh
              key={i}
              position={[-1.05 + i * 0.34, -1.25 - (i % 3) * 0.15, 0.3]}
              rotation={[0, 0, -0.14]}
            >
              {kind === "snow" ? (
                <icosahedronGeometry args={[0.045]} />
              ) : (
                <capsuleGeometry args={[0.029, 0.15, 4, 8]} />
              )}
              <meshPhysicalMaterial
                color={kind === "snow" ? "#fff" : "#8bbdc8"}
                roughness={0.12}
                metalness={0.1}
                clearcoat={1}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function Sky({ code, night, reduced }: { code: number; night: boolean; reduced: boolean }) {
  const pointer = useRef({ x: 0, y: 0, pressed: false });
  const invalidate = useRef<(() => void) | null>(null);
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    try {
      setSupported(!!(canvas.getContext("webgl2") || canvas.getContext("webgl")));
    } catch {
      setSupported(false);
    }
  }, []);
  const fallback = <SkyFallback night={night} />;
  return (
    <div
      className="sky-object"
      role="img"
      aria-label={`Interactive 3D ${night ? "night" : "day"} sky. Move your pointer to tilt the weather sculpture.`}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        pointer.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        pointer.current.y = ((e.clientY - r.top) / r.height) * 2 - 1;
        invalidate.current?.();
      }}
      onPointerLeave={() => {
        pointer.current = { x: 0, y: 0, pressed: false };
      }}
      onPointerDown={() => {
        pointer.current.pressed = true;
      }}
      onPointerUp={() => {
        pointer.current.pressed = false;
      }}
    >
      <SkyBoundary fallback={fallback}>
        {supported ? (
          <Canvas
            shadows={{ type: THREE.PCFShadowMap }}
            frameloop={reduced ? "demand" : "always"}
            dpr={[1, 1.75]}
            camera={{ position: [0, 0, 7.3], fov: 35 }}
            gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
            onCreated={({ gl, invalidate: requestFrame }) => {
              invalidate.current = requestFrame;
              gl.domElement.addEventListener("webglcontextlost", () => setSupported(false), {
                once: true,
              });
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.05;
            }}
          >
            <CameraFit />
            <Environment />
            <ambientLight intensity={0.6} />
            <directionalLight
              position={[-3, 6, 5]}
              intensity={2.2}
              castShadow
              shadow-mapSize={[512, 512]}
            />
            <pointLight position={[4, 0, 3]} intensity={8} color={night ? "#aabff2" : "#fff3c4"} />
            <WeatherObject kind={skyKind(code)} night={night} pointer={pointer} reduced={reduced} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
              <planeGeometry args={[20, 20]} />
              <shadowMaterial transparent opacity={0.09} />
            </mesh>
          </Canvas>
        ) : (
          fallback
        )}
      </SkyBoundary>
    </div>
  );
}

export default memo(Sky);
