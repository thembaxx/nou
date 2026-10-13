/* oxlint-disable react/immutability -- Three.js scene and renderer are imperative external objects managed by React Three Fiber. */
"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, useId, Component, memo, type ReactNode } from "react";
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

type SkyPointer = {
  x: number;
  y: number;
  pressed: boolean;
  angle: number;
  velocity: number;
  spinAt: number;
  releasedAt: number;
};

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
  pointer: React.RefObject<SkyPointer>;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const turntable = useRef<THREE.Group>(null);
  const sun = useRef<THREE.Mesh>(null);
  const drops = useRef<THREE.Group>(null);
  const stars = useRef<THREE.Group>(null);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    delta = Math.min(delta, 0.05);
    const t = reduced ? 0 : clock.elapsedTime;
    const interaction = pointer.current;
    if (!reduced && !interaction.pressed) {
      interaction.angle += interaction.velocity * delta;
      interaction.velocity *= Math.exp(-7 * delta);
      interaction.angle = THREE.MathUtils.damp(interaction.angle, 0, 3, delta);
    }
    if (turntable.current) {
      const progress = interaction.spinAt
        ? Math.min(1, (performance.now() - interaction.spinAt) / 1150)
        : 0;
      turntable.current.rotation.y =
        reduced || progress === 1 ? 0 : (1 - Math.pow(1 - progress, 3)) * Math.PI * 2;
    }
    group.current.position.y = Math.sin(t * 0.75) * 0.085;
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      reduced ? 0 : interaction.x * 0.35 + interaction.angle,
      4,
      delta,
    );
    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      reduced ? 0.06 : interaction.y * 0.13,
      4,
      delta,
    );
    const sinceRelease = (performance.now() - interaction.releasedAt) / 1000;
    const bounce =
      sinceRelease < 0.8 ? Math.sin(sinceRelease * 18) * 0.055 * Math.exp(-sinceRelease * 5) : 0;
    const size = reduced ? 1 : interaction.pressed ? 0.965 : 1 + bounce;
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
    <group ref={turntable}>
      <group ref={group} rotation={[0.06, -0.18, -0.08]}>
        {night ? (
          <group
            position={[showCloud ? 0.9 : 0.1, showCloud ? 0.72 : 0.2, -0.6]}
            rotation={[0, 0, -0.45]}
          >
            <mesh ref={sun}>
              <torusGeometry args={[0.72, 0.25, 24, 72, Math.PI * 1.55]} />
              <meshPhysicalMaterial
                color="#e6edde"
                roughness={0.2}
                metalness={0.12}
                clearcoat={1}
              />
            </mesh>
            <group ref={stars}>
              {[
                [-1.4, 0.8, 0],
                [1.55, 0.4, 0.3],
                [1.1, -1.1, 0.2],
              ].map((p, i) => (
                <mesh
                  key={i}
                  position={p as [number, number, number]}
                  rotation={[0, 0, Math.PI / 4]}
                >
                  <octahedronGeometry args={[i === 0 ? 0.11 : 0.065]} />
                  <meshStandardMaterial
                    color="#eff5d8"
                    emissive="#c6d29a"
                    emissiveIntensity={0.3}
                  />
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
    </group>
  );
}

function Sky({ code, night, reduced }: { code: number; night: boolean; reduced: boolean }) {
  const hintId = useId();
  const pointer = useRef<SkyPointer>({
    x: 0,
    y: 0,
    pressed: false,
    angle: 0,
    velocity: 0,
    spinAt: 0,
    releasedAt: 0,
  });
  const element = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    x: number;
    y: number;
    lastX: number;
    time: number;
    dragging: boolean;
  } | null>(null);
  const lastTap = useRef(0);
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invalidate = useRef<(() => void) | null>(null);
  const [supported, setSupported] = useState(true);
  const [active, setActive] = useState(true);
  const [playing, setPlaying] = useState<"idle" | "dragging" | "spinning">("idle");
  useEffect(() => {
    const canvas = document.createElement("canvas");
    try {
      setSupported(!!(canvas.getContext("webgl2") || canvas.getContext("webgl")));
    } catch {
      setSupported(false);
    }
    let inView = true;
    const update = () => {
      setActive(inView && document.visibilityState === "visible");
      invalidate.current?.();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        update();
      },
      { rootMargin: "80px" },
    );
    if (element.current) observer.observe(element.current);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      if (spinTimer.current) clearTimeout(spinTimer.current);
    };
  }, []);
  function spin() {
    if (
      reduced ||
      (performance.now() - pointer.current.spinAt < 1200 && pointer.current.spinAt !== 0)
    )
      return;
    pointer.current.spinAt = performance.now();
    setPlaying("spinning");
    invalidate.current?.();
    if (spinTimer.current) clearTimeout(spinTimer.current);
    spinTimer.current = setTimeout(() => setPlaying("idle"), 1200);
  }
  function release() {
    pointer.current.pressed = false;
    pointer.current.releasedAt = performance.now();
    gesture.current = null;
    setPlaying((current) => (current === "dragging" ? "idle" : current));
    invalidate.current?.();
  }
  const fallback = (
    <div className="sky-play-fallback">
      <SkyFallback night={night} />
    </div>
  );
  return (
    <div
      ref={element}
      className="sky-object"
      role="button"
      tabIndex={0}
      data-state={playing}
      aria-label={`Play with the ${night ? "night" : "day"} sky`}
      aria-describedby={hintId}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        pointer.current.pressed = true;
        pointer.current.velocity = 0;
        gesture.current = {
          x: event.clientX,
          y: event.clientY,
          lastX: event.clientX,
          time: performance.now(),
          dragging: false,
        };
        invalidate.current?.();
      }}
      onPointerMove={(event) => {
        if (reduced) return;
        const box = event.currentTarget.getBoundingClientRect();
        pointer.current.x = ((event.clientX - box.left) / box.width) * 2 - 1;
        pointer.current.y = ((event.clientY - box.top) / box.height) * 2 - 1;
        const current = gesture.current;
        if (current) {
          const dx = event.clientX - current.x,
            dy = event.clientY - current.y;
          if (!current.dragging && Math.abs(dy) > Math.abs(dx) * 1.5 && Math.abs(dy) > 8) {
            release();
            return;
          }
          if (!current.dragging && Math.abs(dx) > 8) {
            current.dragging = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            setPlaying("dragging");
          }
          if (current.dragging) {
            const time = performance.now(),
              change = (event.clientX - current.lastX) * 0.012;
            pointer.current.angle = Math.max(-1.4, Math.min(1.4, pointer.current.angle + change));
            pointer.current.velocity = Math.max(
              -4,
              Math.min(4, change / Math.max((time - current.time) / 1000, 0.016)),
            );
            current.lastX = event.clientX;
            current.time = time;
          }
        }
        invalidate.current?.();
      }}
      onPointerUp={(event) => {
        if (gesture.current && !gesture.current.dragging && event.pointerType === "touch") {
          const time = performance.now();
          if (lastTap.current > 0 && time - lastTap.current < 320) {
            spin();
            lastTap.current = 0;
          } else lastTap.current = time;
        }
        release();
      }}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onPointerLeave={() => {
        pointer.current.x = 0;
        pointer.current.y = 0;
        if (!gesture.current?.dragging) release();
      }}
      onDoubleClick={spin}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          spin();
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          if (!reduced) {
            pointer.current.angle += event.key === "ArrowLeft" ? -0.45 : 0.45;
            invalidate.current?.();
          }
        }
      }}
    >
      <span id={hintId} className="sr-only">
        Drag left or right to turn the weather sculpture. Double tap, double click, or press Enter
        for a little spin.
      </span>
      <div className="sky-render" aria-hidden="true">
        <SkyBoundary fallback={fallback}>
          {supported ? (
            <Canvas
              shadows={{ type: THREE.PCFShadowMap }}
              frameloop={reduced || !active ? "demand" : "always"}
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
              <pointLight
                position={[4, 0, 3]}
                intensity={8}
                color={night ? "#aabff2" : "#fff3c4"}
              />
              <WeatherObject
                kind={skyKind(code)}
                night={night}
                pointer={pointer}
                reduced={reduced}
              />
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
      <span className="sky-play-note" aria-hidden="true">
        {playing === "spinning"
          ? "A little spin. A little joy."
          : playing === "dragging"
            ? "A little more perspective."
            : ""}
      </span>
    </div>
  );
}

export default memo(Sky);
