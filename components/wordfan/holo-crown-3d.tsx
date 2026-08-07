'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Coroa holográfica 3D real (React Three Fiber).
 * Mesmo tratamento do cubo holográfico: vidro cromático iridescente que
 * refrata um ambiente arco-íris, girando continuamente. Usada para marcar
 * contratantes Enterprise aprovados.
 */

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => {
      const coarse = window.matchMedia('(pointer: coarse)').matches
      const small = window.innerWidth < 768
      const lowCores =
        typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4
      setIsMobile(coarse || small || lowCores)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

/** Material de vidro holográfico compartilhado (uma instância por mesh). */
function HoloGlass({ mobile }: { mobile: boolean }) {
  return (
    <MeshTransmissionMaterial
      transmission={1}
      thickness={0.45}
      ior={1.4}
      chromaticAberration={mobile ? 0.8 : 1.5}
      anisotropy={mobile ? 0.3 : 0.7}
      distortion={mobile ? 0.2 : 0.45}
      distortionScale={0.4}
      temporalDistortion={mobile ? 0 : 0.15}
      roughness={0.12}
      metalness={0.15}
      iridescence={0.7}
      iridescenceIOR={1.8}
      iridescenceThicknessRange={[100, 460]}
      clearcoat={1}
      clearcoatRoughness={0.1}
      envMapIntensity={5}
      transparent
      backside={!mobile}
      backsideThickness={0.35}
      samples={mobile ? 4 : 8}
      resolution={mobile ? 256 : 768}
      color="#ffffff"
      attenuationColor="#ffffff"
      attenuationDistance={8}
    />
  )
}

function Crown({ mobile = false }: { mobile?: boolean }) {
  const spin = useRef<THREE.Group>(null)

  // Posições dos 8 pontos (spikes) da coroa ao redor do topo
  const spikes = useMemo(() => {
    const count = 8
    const radius = 1
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2
      return { x: Math.cos(a) * radius, z: Math.sin(a) * radius, key: i }
    })
  }, [])

  useFrame((state, delta) => {
    if (spin.current) {
      spin.current.rotation.y += delta * 0.7
      // leve balanço para dar volume
      spin.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.6) * 0.12 - 0.12
    }
  })

  return (
    <group ref={spin} scale={1.15} position={[0, -0.1, 0]}>
      {/* Aro principal da coroa (cilindro aberto) */}
      <mesh>
        <cylinderGeometry args={[1, 1, 0.72, 64, 1, true]} />
        <HoloGlass mobile={mobile} />
      </mesh>

      {/* Rebordo inferior */}
      <mesh position={[0, -0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.09, 16, 64]} />
        <HoloGlass mobile={mobile} />
      </mesh>

      {/* Rebordo superior */}
      <mesh position={[0, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.07, 16, 64]} />
        <HoloGlass mobile={mobile} />
      </mesh>

      {/* Pontas da coroa + gemas nas pontas */}
      {spikes.map((s) => (
        <group key={s.key} position={[s.x, 0.36, s.z]}>
          <mesh position={[0, 0.42, 0]}>
            <coneGeometry args={[0.2, 0.85, 4]} />
            <HoloGlass mobile={mobile} />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <octahedronGeometry args={[0.12, 0]} />
            <HoloGlass mobile={mobile} />
          </mesh>
        </group>
      ))}

      {/* Gema central grande no aro frontal */}
      <mesh position={[0, 0, 1]}>
        <octahedronGeometry args={[0.2, 0]} />
        <HoloGlass mobile={mobile} />
      </mesh>
    </group>
  )
}

/** Ambiente arco-íris que gera os reflexos holográficos. */
function RainbowEnvironment({ mobile = false }: { mobile?: boolean }) {
  return (
    <Environment resolution={mobile ? 256 : 768} background={false}>
      <Lightformer form="rect" intensity={0} color="#000000" position={[0, 0, 6]} scale={[16, 16, 1]} />
      <Lightformer form="ring" intensity={7} color="#ff3010" position={[-5, 1, 3]} scale={6.5} />
      <Lightformer form="circle" intensity={3} color="#0aff3c" position={[5, -2, 3]} scale={4.5} />
      <Lightformer form="rect" intensity={4} color="#ffc400" position={[-3, -3, 2]} scale={[6, 5, 1]} />
      <Lightformer form="circle" intensity={6.5} color="#a855ff" position={[5, 3, -1]} scale={6} />
      <Lightformer form="circle" intensity={2.5} color="#14e2ff" position={[-2, 4, 2]} scale={3} />
      <Lightformer form="rect" intensity={4} color="#ff18b0" position={[3, 0, -5]} scale={[8, 8, 1]} />
      <Lightformer form="rect" intensity={3} color="#0aa0ff" position={[-4, -1, -4]} scale={[7, 7, 1]} />
    </Environment>
  )
}

function ReadySignal({ onReady }: { onReady?: () => void }) {
  const frames = useRef(0)
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    frames.current += 1
    if (frames.current >= 4) {
      done.current = true
      onReady?.()
    }
  })
  return null
}

export function HolographicCrown3D({
  className,
  size,
  onReady,
  label = 'Contratante Enterprise',
}: {
  className?: string
  size?: number
  onReady?: () => void
  label?: string
}) {
  const mobile = useIsMobile()
  const style = size ? { width: size, height: size } : undefined

  return (
    <div className={className} style={style} role="img" aria-label={label} title={label}>
      <Canvas
        dpr={mobile ? [1, 1.5] : [1, 2]}
        camera={{ position: [0, 0.4, 4.6], fov: 42 }}
        gl={{ alpha: true, antialias: !mobile, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.06} />
        <pointLight position={[5, 5, 5]} intensity={10} color="#c084fc" />
        <pointLight position={[-5, -3, 4]} intensity={5} color="#22d3ee" />
        <RainbowEnvironment mobile={mobile} />
        <Crown mobile={mobile} />
        <ReadySignal onReady={onReady} />
      </Canvas>
    </div>
  )
}
