import { motion } from "framer-motion";
import {
  Users,
  Target,
  LayoutGrid,
  Footprints,
  GraduationCap,
  MessageCircle,
  Monitor,
} from "lucide-react";
import type { Recommendation } from "@/lib/checklistData";

const iconMap: Record<string, React.ElementType> = {
  users: Users,
  target: Target,
  layout: LayoutGrid,
  footprints: Footprints,
  "graduation-cap": GraduationCap,
  "message-circle": MessageCircle,
  monitor: Monitor,
};

const HERO_IMAGE = "https://private-us-east-1.manuscdn.com/sessionFile/fryN8iHtFszaWffjwnugM7/sandbox/jjQbhmJzPW9T01RZHnYQWi-img-1_1771404797000_na1fn_aGVyby1pbmR1c3RyaWFs.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvZnJ5TjhpSHRGc3phV2ZmandudWdNNy9zYW5kYm94L2pqUWJobUp6UFc5VDAxUlpIbllRV2ktaW1nLTFfMTc3MTQwNDc5NzAwMF9uYTFmbl9hR1Z5YnkxcGJtUjFjM1J5YVdGcy5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=ZVHUy0thqSErOuQ~xiPl~ontXhx8Srj0nDXIJYZWScg08G-K49D7-AzZtwj-Ri~2mLyhCEUG6CqaU19c4mQ2RSOecFmOy-BeupEho7voZ~Gw3imFK2kxlnLxJgghhkg0whCdjTHdnjelKucodxellQWCV4gVhJm-p2~AwbHTYE5h87E2q-IMn2qbjGye3hUt~ZDU9KoNBqdYqk8Npf14rDzvdp3y9wbEqZ7d0xaSyoexnukA3fGc1Yg4Xyo4kzHSbsuDnH7Z3X7EYK~lDs-4iKP6hlgK4fIwz54A2Tw~MDQ0GCz-9aYviq0Qs4vN2IAYM3xPzW277LOfLin1udWe5g__";

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
}

export default function RecommendationsPanel({
  recommendations,
}: RecommendationsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative rounded-xl overflow-hidden h-48">
        <img
          src={HERO_IMAGE}
          alt="Industrial background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-center px-8">
          <h2 className="font-mono text-2xl font-bold text-white tracking-tight">
            Рекомендации
          </h2>
          <p className="text-sm text-white/70 mt-2 max-w-md">
            Ключевые принципы эффективного управления производством.
            Используйте эти советы для построения системы, которая работает стабильно.
          </p>
        </div>
      </div>

      {/* Recommendations grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec, index) => {
          const Icon = iconMap[rec.icon] || Target;
          return (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="rounded-xl border border-border p-5 hover:border-primary/30 transition-all duration-300 group"
              style={{ background: "oklch(0.18 0.012 260)" }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"
                  style={{ background: "oklch(0.78 0.16 75 / 0.12)" }}
                >
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-mono text-sm font-semibold text-foreground mb-2">
                    {rec.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {rec.text}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
