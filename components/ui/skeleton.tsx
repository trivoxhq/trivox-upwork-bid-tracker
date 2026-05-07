"use client";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-[#EEEEEE] ${className}`} aria-hidden />;
}
