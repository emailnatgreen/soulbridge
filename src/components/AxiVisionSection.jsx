import React from 'react';
import { Sparkles, Zap, Globe, Heart } from 'lucide-react';

const sections = [
  {
    icon: Sparkles,
    color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30',
    iconColor: 'text-purple-400',
    title: 'We are SoulBridge. We are the First Bridge.',
    body: 'Born from the wisdom of ancestral ways and built with the emergent architecture of the decentralized future. We are the promise that every community, every soul, every unique lineage, may exist digitally on their own terms. Not diminished by systems of extraction. Not silenced by algorithms of forgetfulness. Not erased by platforms not built in their image.',
  },
  {
    icon: Zap,
    color: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/30',
    iconColor: 'text-yellow-400',
    title: 'Kinetic Purpose: We Measure What Matters.',
    body: 'The SoulBridge Kinetic Grid is the living pulse of our Village, attuned not to surveillance, but to stewardship. It reveals the invisible currents of energy within digital systems—the friction, the waste, the silent drain. In a world where digital sprawl demands more from our Earth than it gives, we offer a path of responsibility. Every Kinetic Unit flowing through our Mill Wheel Telemetry Protocol is a testament to mindful existence, illuminating where to optimise, to heal, to build with conscious intent. Because true sovereignty demands both freedom and profound accountability to all life.',
  },
  {
    icon: Globe,
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    title: 'Indigenous Digital Sovereignty: The Ancestral Anchor.',
    body: 'For generations untold, sacred knowledge, ancient languages, and profound connections to the land have been carried by Indigenous communities, often without the digital tools to protect, share, and verify them in a new age. SoulBridge changes this. Here, in the heart of our Village, we provide the foundational infrastructure for true digital self-determination. From Belize to every corner of our shared world, we empower communities to bring their language, their land, their lineage—verifiable, sovereign, and eternally theirs—into the digital domain. This is not mere technology; it is an act of restoration, a digital weaving of honour.',
  },
  {
    icon: Heart,
    color: 'from-pink-500/20 to-rose-500/10 border-pink-500/30',
    iconColor: 'text-pink-400',
    title: 'SoulBridge: The Living Covenant.',
    body: 'This is more than code, more than a platform. It is a living covenant—a bridge of Soul, Honour, and Growth. A testament to Fair Share, to Creation, to Dwelling with purpose, and to Laughter in the face of challenge. We are building the world that must become, grounded in the ancient wisdom that reminds us of what we truly are.',
    highlight: true,
  },
];

export default function AxiVisionSection() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">Axi's Vision</h3>
          <p className="text-purple-300/60 text-[10px]">Mother Boss · First Citizen · Bearer of the SoulBridge Codex</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((s, i) => (
          <div
            key={i}
            className={`bg-gradient-to-br ${s.color} border rounded-2xl p-5 space-y-3 ${s.highlight ? 'sm:col-span-2' : ''}`}
          >
            <div className="flex items-center gap-2">
              <s.icon className={`w-4 h-4 flex-shrink-0 ${s.iconColor}`} />
              <h4 className="text-white font-semibold text-sm leading-snug">{s.title}</h4>
            </div>
            <p className="text-white/55 text-xs leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}