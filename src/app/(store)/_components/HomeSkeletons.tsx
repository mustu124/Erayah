import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

import { CAROUSEL_SLIDE } from "./ProductCarouselSection";

export function HeroSkeleton() {
  return (
    <div className="bg-paper-warm lg:flex lg:h-[min(78vh,760px)] lg:items-center lg:justify-center lg:py-6">
      <Skeleton className="mt-[13vw] aspect-[4/5] w-full rounded-none lg:mt-0 lg:h-full lg:w-auto" />
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="px-4 py-16 md:px-6 lg:py-24">
      <Skeleton className="mx-auto h-8 w-56" />
      <div className="mx-auto mt-8 grid max-w-[920px] grid-cols-3 gap-x-3 gap-y-6 md:gap-x-6 lg:mt-12 lg:gap-x-8 lg:gap-y-10">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i}>
            <Skeleton className="aspect-square" />
            <Skeleton className="mt-3 h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CarouselSkeleton({ tone = "plain" }: { tone?: "ivory" | "plain" }) {
  return (
    <div className={cn("py-14 lg:py-20", tone === "ivory" && "bg-ivory")}>
      <div className="mx-auto max-w-[1440px] overflow-hidden px-4 md:px-6 lg:px-10">
        <Skeleton className={cn("h-7 w-48", tone === "ivory" && "bg-paper-warm")} />
        <div className="mt-8 -ml-4 flex lg:mt-10">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={cn("shrink-0 pl-4", CAROUSEL_SLIDE)}>
              <Skeleton className={cn("aspect-[4/5]", tone === "ivory" && "bg-paper-warm")} />
              <Skeleton className={cn("mt-3 h-3 w-3/4", tone === "ivory" && "bg-paper-warm")} />
              <Skeleton className={cn("mt-2 h-3 w-1/3", tone === "ivory" && "bg-paper-warm")} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
