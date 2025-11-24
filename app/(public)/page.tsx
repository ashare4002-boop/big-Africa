"use client";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookOpen, Users, Target, Zap, Award, Globe, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

interface featureProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const features: featureProps[] = [
  {
    title: "Access Learning Spaces",
    description:
      "We transform existing spaces—community centers into modern training hubs, minimizing costs and ensuring everyone can access education close to home.",
    icon: <Users className="w-6 h-6" />,
  },
  {
    title: "Innovative Learning Methods",
    description:
      "Our training programs are hands-on, deeply connected to Cameroonian realities, and designed to build real-world skills that lead directly to meaningful careers.",
    icon: <Zap className="w-6 h-6" />,
  },
  {
    title: "Strategic Partnerships",
    description:
      "We collaborate with businesses, schools, and NGOs to provide internships, scholarships, and co-certified diplomas creating a bridge from learning to employment.",
    icon: <Target className="w-6 h-6" />,
  },
  {
    title: "Learning Communities",
    description:
      "We're building a vibrant pan-Cameroonian network where learners, educators, and partners connect, collaborate, and grow together toward a shared future.",
    icon: <Globe className="w-6 h-6" />,
  },
];

const stats = [
  { number: "10K+", label: "Active Learners" },
  { number: "500+", label: "Courses" },
  { number: "95%", label: "Success Rate" },
  { number: "50+", label: "Centers" },
];

const FadeInOnScroll = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById(`fade-${delay}`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      id={`fade-${delay}`}
      className={`transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      {children}
    </div>
  );
};

export default function Home() {
  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        .float-animation {
          animation: float 5s ease-in-out infinite;
        }

        .button-hover:hover {
          transform: translateY(-2px);
        }

        .card-hover {
          transition: all 0.3s ease;
        }

        .card-hover:hover {
          transform: translateY(-4px);
        }

        .gradient-text {
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .grid-pattern {
          background-image: 
            linear-gradient(0deg, transparent 24%, rgba(var(--ring-rgb), 0.05) 25%, rgba(var(--ring-rgb), 0.05) 26%, transparent 27%, transparent 74%, rgba(var(--ring-rgb), 0.05) 75%, rgba(var(--ring-rgb), 0.05) 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, rgba(var(--ring-rgb), 0.05) 25%, rgba(var(--ring-rgb), 0.05) 26%, transparent 27%, transparent 74%, rgba(var(--ring-rgb), 0.05) 75%, rgba(var(--ring-rgb), 0.05) 76%, transparent 77%, transparent);
          background-size: 50px 50px;
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-background grid-pattern -z-10" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-8 px-4 md:px-8 max-w-5xl mx-auto py-20">
          {/* Badge */}
          <FadeInOnScroll delay={100}>
            <Badge variant="outline" className="px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5">
              🚀 Transforming Education in Cameroon
            </Badge>
          </FadeInOnScroll>

          {/* Main Heading */}
          <FadeInOnScroll delay={200}>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              Empowering <span className="text-primary">Education</span> Through Cameroon
            </h1>
          </FadeInOnScroll>

          {/* Description */}
          <FadeInOnScroll delay={300}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              A-share stands as a transformative movement for education. By removing geographical and economic barriers, we make global-quality learning accessible to all, empowering youth and adults alike to grow and succeed.
            </p>
          </FadeInOnScroll>

          {/* CTA Buttons */}
          <FadeInOnScroll delay={400}>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                className={`${buttonVariants({
                  size: "lg",
                })} button-hover group`}
                href="/courses"
              >
                Explore Courses
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                className={`${buttonVariants({
                  size: "lg",
                  variant: "outline",
                })} button-hover`}
                href="/login"
              >
                Sign In
              </Link>

              <Link
                className={`${buttonVariants({
                  size: "lg",
                  variant: "ghost",
                })} button-hover`}
                href="/about"
              >
                Learn More
              </Link>
            </div>
          </FadeInOnScroll>

          {/* Scroll Indicator */}
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
            <svg className="w-5 h-5 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 md:px-8 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat, index) => (
              <FadeInOnScroll key={index} delay={index * 100}>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                    {stat.number}
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground">{stat.label}</p>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <FadeInOnScroll>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">How A-Share Works</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                We're revolutionizing education through innovation, partnerships, and community
              </p>
            </div>
          </FadeInOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <FadeInOnScroll key={index} delay={index * 150}>
                <Card className="card-hover border-border/50 bg-card/50 hover:border-primary/50 hover:bg-primary/5">
                  <CardHeader className="pb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:bg-primary/20 transition-colors">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-24 px-4 md:px-8 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <FadeInOnScroll>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose A-Share?</h2>
            </div>
          </FadeInOnScroll>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: <BookOpen className="w-6 h-6" />,
                title: "Industry-Relevant Curriculum",
                description: "Designed with leading companies to ensure you learn what the market demands.",
              },
              {
                icon: <Award className="w-6 h-6" />,
                title: "Certified & Recognized",
                description: "Earn co-certified diplomas recognized across Cameroon and beyond.",
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: "Expert Instructors",
                description: "Learn from professionals who bring real-world expertise to every lesson.",
              },
              {
                icon: <Globe className="w-6 h-6" />,
                title: "Global Standards, Local Context",
                description: "World-class education tailored to Cameroonian realities and opportunities.",
              },
            ].map((item, index) => (
              <FadeInOnScroll key={index} delay={index * 150}>
                <div className="card-hover p-8 rounded-lg bg-background border border-border/50 hover:border-primary/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <FadeInOnScroll>
            <div className="relative bg-primary text-primary-foreground rounded-xl p-12 md:p-16 text-center space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold">Ready to Start Learning?</h3>
              <p className="text-lg opacity-95 max-w-2xl mx-auto">
                Join thousands of learners across Cameroon who are building the skills they need for success.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link
                  className={`${buttonVariants({
                    size: "lg",
                    variant: "secondary",
                  })} button-hover`}
                  href="/courses"
                >
                  Explore Courses
                </Link>
                <Link
                  className={`${buttonVariants({
                    size: "lg",
                    variant: "outline",
                  })} button-hover text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10`}
                  href="/login"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </FadeInOnScroll>
        </div>
      </section>
    </>
  );
}
