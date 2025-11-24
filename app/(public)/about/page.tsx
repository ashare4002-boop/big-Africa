"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Target,
  Users,
  Lightbulb,
  Globe,
  CheckCircle2,
  TrendingUp,
  Zap,
} from "lucide-react";

const FadeInOnScroll = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => {
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

export default function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-background -z-10" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-6 px-4 md:px-8 max-w-4xl mx-auto py-20">
          <FadeInOnScroll delay={100}>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              About <span className="text-primary">A-Share</span>
            </h1>
          </FadeInOnScroll>

          <FadeInOnScroll delay={200}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              We're on a mission to democratize world-class education across
              Africa. By removing barriers and creating opportunities, A-Share
              empowers individuals to build the futures they deserve.
            </p>
          </FadeInOnScroll>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-24 px-4 md:px-8 border-t border-border">
        <div className="max-w-4xl mx-auto space-y-12">
          <FadeInOnScroll>
            <div className="space-y-8">
              <h2 className="text-4xl font-bold">Our Vision & Mission</h2>

              <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">
                    Education is the foundation of progress.
                  </strong>{" "}
                  It shapes minds, forges skills, and unleashes human potential.
                  Yet across Africa, millions of talented individuals are locked
                  out of quality education not because they lack ability, but
                  because of circumstance.
                </p>

                <p>
                  At A-Share, we believe that a person's zip code, bank account,
                  or family background should never limit their dreams. Quality
                  education must be accessible to everyone. By starting in
                  Cameroon and expanding across Africa, we're building a
                  movement that transforms education from a privilege into a
                  right.
                </p>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 my-6">
                  <p className="text-foreground font-semibold mb-3">
                    Our Core Mission:
                  </p>
                  <p>
                    To provide high-quality, affordable, industry-aligned
                    education that removes geographical and economic barriers,
                    enabling young people and professionals across Africa to
                    build meaningful careers and contribute to their
                    communities.
                  </p>
                </div>

                <p>We envision a future where:</p>

                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    <span>
                      A brilliant student in a rural village has the same access
                      to world-class courses as one in the capital
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    <span>
                      Financial constraints don't determine educational
                      opportunity or career success
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    <span>
                      Education directly connects to employment, with students
                      earning recognized certifications and landing real jobs
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    <span>
                      African expertise and perspectives shape the curriculum,
                      not just external models
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    <span>
                      Communities are strengthened through education, not
                      extracted from
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* The Challenge Section */}
      <section className="py-24 px-4 md:px-8 bg-secondary/30">
        <div className="max-w-4xl mx-auto space-y-12">
          <FadeInOnScroll>
            <div className="space-y-8">
              <h2 className="text-4xl font-bold">
                The Barriers We're Breaking
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                The crisis in African education isn't about lack of talent or
                motivation. It's about systemic barriers that prevent talented
                individuals from accessing opportunities. Here's what we're
                confronting:
              </p>
            </div>
          </FadeInOnScroll>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Geographic Isolation",
                description:
                  "Schools and universities concentrate in cities. Rural communities, accounting for 60%+ of Africa's population, are cut off from quality education.",
                details: [
                  "Rural students travel 50+ km for university",
                  "Limited digital infrastructure in remote areas",
                  "Transportation costs prohibitive for many families",
                  "Regional brain drain as youth migrate to cities",
                ],
                icon: <Globe className="w-6 h-6" />,
              },
              {
                title: "Economic Exclusion",
                description:
                  "Quality education remains the privilege of the wealthy. A typical family earning $100-200/month cannot afford even basic vocational training.",
                details: [
                  "University tuition: $2,000-8,000/year (10x+ average income)",
                  "Only 2-3 of 10 Baccalaureate graduates access higher education",
                  "Most talented young people exit school system due to cost",
                  "Debt burden prevents career exploration and innovation",
                ],
                icon: <Target className="w-6 h-6" />,
              },
              {
                title: "Outdated Pedagogy",
                description:
                  "Current teaching methods prioritize memorization over skills, theory over practice, exams over real-world application.",
                details: [
                  "Curriculum disconnected from job market needs",
                  "Emphasis on theoretical knowledge, minimal hands-on training",
                  "Limited exposure to modern tools and technologies",
                  "Low employment rate for graduates despite credentials",
                ],
                icon: <Lightbulb className="w-6 h-6" />,
              },
              {
                title: "Infrastructure Deficit",
                description:
                  "Building new schools costs millions and takes years. Most regions lack the facilities needed for quality technical and digital training.",
                details: [
                  "Building new centers: $100,000-500,000+ per location",
                  "Years of planning, permitting, and construction",
                  "Maintenance costs burden local governments",
                  "Digital labs and studios remain rare luxuries",
                ],
                icon: <Users className="w-6 h-6" />,
              },
            ].map((item, index) => (
              <FadeInOnScroll key={index} delay={index * 150}>
                <Card className="border-border/50 bg-background">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                      {item.icon}
                    </div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{item.description}</p>
                    <ul className="space-y-2">
                      {item.details.map((detail, idx) => (
                        <li
                          key={idx}
                          className="flex gap-2 text-sm text-muted-foreground"
                        >
                          <span className="text-primary">•</span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </FadeInOnScroll>
            ))}
          </div>

          <FadeInOnScroll delay={400}>
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6 space-y-4">
              <h3 className="font-bold text-lg">The Reality Check</h3>
              <p className="text-muted-foreground">
                In a typical Cameroon classroom of 10 students: 6 enroll in
                underfunded public universities, 2 attend private institutions
                (if families can afford it), 1 studies abroad (usually wealthy
                families), and 1 gets no higher education at all. The brilliant
                student from a poor family has less than 10% chance of quality
                post-secondary education.
              </p>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* Our Approach Section */}
      <section className="py-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          <FadeInOnScroll>
            <div className="space-y-6">
              <h2 className="text-4xl font-bold">Our Four-Pillar Strategy</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                A-Share isn't just identifying problems—we're solving them with
                a pragmatic, proven approach built on four strategic pillars:
              </p>
            </div>
          </FadeInOnScroll>

          <div className="space-y-16">
            {[
              {
                number: "01",
                title: "Accessible & Scalable Infrastructure",
                description:
                  "Transform existing community spaces into modern learning hubs without million-dollar construction budgets.",
                fullDescription:
                  "Building new educational facilities costs $100,000-500,000 per center and takes years. We've pioneered a different approach: partnering with existing community infrastructure.",
                howItWorks: [
                  "We identify underutilized spaces in towns across Cameroon—cybercafés, community centers, libraries, religious spaces",
                  "We evaluate their potential (internet connectivity, basic equipment, space for 10+ learners)",
                  "Minimal renovations transform these spaces into fully functional learning centers",
                ],

                benefits: [
                  "Deploy 10x faster than traditional models",
                  "Reduce capital costs by 90%+",
                  "Support local business owners directly",
                  "Create immediate economic opportunity in communities",
                ],
                icon: <Zap className="w-6 h-6" />,
              },
              {
                number: "02",
                title: "Innovation-Driven, Locally-Rooted Pedagogy",
                description:
                  "Replace theory-heavy, job-market-disconnected teaching with industry-aligned, hands-on learning.",
                fullDescription:
                  "The problem: students memorize textbooks but can't solve real problems. The solution: curriculum designed WITH industry experts, FOR actual job requirements.",
                howItWorks: [
                  "Each course is co-designed by industry professionals, educators, and market researchers",
                  "Curriculum emphasizes 40% theory + 60% practical application",
                  "Students work on real-world projects from day one—not hypothetical case studies",
                  "Content adapts continuously based on job market demand and student outcomes",
                  "Courses integrate Cameroonian context and examples, not just Western textbooks",
                ],
                example:
                  "Our Cybersecurity course: Week 1-2 theory on encryption, networks, threat vectors. Week 3+ students audit actual systems, find vulnerabilities, write real reports. By week 8, graduates have portfolio projects and can apply for jobs as junior security analysts.",
                benefits: [
                  "Graduates are job-ready, not job-seeking",
                  "Curriculum stays ahead of market changes",
                  "Students see immediate relevance and engagement increases",
                  "African context ensures cultural and economic fit",
                ],
                icon: <Lightbulb className="w-6 h-6" />,
              },
              {
                number: "03",
                title: "Strategic Partnerships & Employment Bridge",
                description:
                  "Connect learning directly to employment through corporate partnerships and industry credentials.",
                fullDescription:
                  "A degree doesn't guarantee a job. We guarantee the bridge between learning and employment through strategic partnerships.",
                howItWorks: [
                  "We partner with companies across sectors—tech, finance, agriculture, logistics",
                  "Companies provide internship placements, co-certification, and often hire our graduates",
                  "Students earn recognized credentials co-signed by industry bodies",
                  "Our alumni network helps graduates find work, advance careers, and mentor others",
                  "We track employment outcomes and iterate curriculum based on real results",
                ],
                example:
                  "A student completes our Accounting course co-certified with the Association of Professional Accountants. She lands a 3-month internship at a local firm (often converted to employment), completes real audit and tax work, and graduates with both certification and job experience.",
                benefits: [
                  "90%+ graduate employment/placement rate (our target)",
                  "Companies actively hire from A-Share because graduates are skilled",
                  "Students have credentials + portfolio + professional network",
                  "Continuous feedback loop ensures curriculum stays relevant",
                ],
                icon: <TrendingUp className="w-6 h-6" />,
              },
              {
                number: "04",
                title: "Vibrant Pan-African Learning Community",
                description:
                  "Build a lifelong network where learners, professionals, and mentors connect and grow together.",
                fullDescription:
                  "Education shouldn't end after completing a course. We're building community that fuels ongoing growth.",
                howItWorks: [
                  "Students connect with peers across Cameroon and Africa in shared learning spaces",
                  "Experienced professionals mentor students and early-career graduates",
                  "Community members share job opportunities, projects, and knowledge",
                  "Alumni continue accessing resources, advanced courses, and career support",
                  "Peer learning groups tackle advanced challenges and stay updated with industry trends",
                ],
                example:
                  "After completing a course, graduates join cohort WhatsApp groups, Discord communities, and quarterly meetups. A graduate lands a job and starts mentoring 2 peers. Two years later, she's leading workshops in her area.",
                benefits: [
                  "Lifelong access to peer support and mentorship",
                  "Job opportunities often come through the network",
                  "Continuous skill updates and advanced learning",
                  "Strong sense of belonging and shared mission",
                ],
                icon: <Users className="w-6 h-6" />,
              },
            ].map((pillar, index) => (
              <FadeInOnScroll key={index} delay={index * 200}>
                <div className="border-l-4 border-primary pl-8 space-y-6">
                  <div className="flex items-start gap-4">
                    <span className="text-5xl font-bold text-primary/20 flex-shrink-0">
                      {pillar.number}
                    </span>
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            {pillar.icon}
                          </div>
                          {pillar.title}
                        </h3>
                      </div>

                      <p className="text-lg text-muted-foreground">
                        {pillar.description}
                      </p>

                      <div className="bg-card rounded-lg p-4 border border-border/50">
                        <p className="text-muted-foreground mb-3">
                          {pillar.fullDescription}
                        </p>
                        <p className="font-semibold text-foreground mb-2">
                          How it works:
                        </p>
                        <ul className="space-y-2">
                          {pillar.howItWorks.map((step, idx) => (
                            <li
                              key={idx}
                              className="flex gap-2 text-sm text-muted-foreground"
                            >
                              <span className="text-primary font-bold min-w-fit">
                                {idx + 1}.
                              </span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-2">
                          Key benefits:
                        </p>
                        <ul className="space-y-2">
                          {pillar.benefits.map((benefit, idx) => (
                            <li
                              key={idx}
                              className="flex gap-2 text-muted-foreground"
                            >
                              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Serve Section */}
      <section className="py-24 px-4 md:px-8 bg-secondary/30">
        <div className="max-w-4xl mx-auto space-y-12">
          <FadeInOnScroll>
            <div className="space-y-6">
              <h2 className="text-4xl font-bold">Who We Serve</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                A-Share serves anyone hungry for growth and opportunity. Here's
                who's already building their future with us:
              </p>
            </div>
          </FadeInOnScroll>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Young People from Under-Resourced Communities",
                description:
                  "Talented students locked out of university or traditional paths due to cost.",
                example:
                  "A 19-year-old from a rural village who excels academically but whose family can't afford university can gain job-ready skills in 6 months at an affordable price and secure employment.",
              },
              {
                title: "Career Changers & Professionals",
                description:
                  "Adults seeking to pivot careers, upskill, or transition to high-demand fields.",
                example:
                  "A 35-year-old accountant wants to transition to tech. Our specialized courses let her build relevant skills while working, then land a developer role.",
              },
              {
                title: "Self-Taught & Passionate Learners",
                description:
                  "People without formal credentials who want structured learning, industry recognition, and career paths.",
                example:
                  "A self-taught designer wants a recognized credential and job placement. A-Share provides structure, mentorship, and connection to employers.",
              },
              {
                title: "Entrepreneurs & Business Owners",
                description:
                  "People building businesses who need specific skills, market insights, or professional development.",
                example:
                  "A young entrepreneur launching a logistics startup takes our Business Operations course to understand accounting, supply chain, and management.",
              },
              {
                title: "Communities & Local Economies",
                description:
                  "Towns and villages gaining learning infrastructure and economic opportunity.",
                example:
                  "A cybercafé owner becomes a learning center partner, generating new revenue while strengthening her community.",
              },
              {
                title: "Employers Seeking Skilled Talent",
                description:
                  "Companies needing job-ready graduates with proven skills and cultural fit.",
                example:
                  "A fintech startup partners with A-Share, provides internships, co-certifies curriculum, and hires graduates who are already productive on day one.",
              },
            ].map((group, index) => (
              <FadeInOnScroll key={index} delay={index * 150}>
                <Card className="border-border/50 bg-background">
                  <CardHeader>
                    <CardTitle className="text-lg">{group.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">{group.description}</p>
                    <div className="bg-primary/5 rounded p-3 border border-primary/20">
                      <p className="text-sm text-muted-foreground italic">
                        {group.example}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Why Different Section */}
      <section className="py-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          <FadeInOnScroll>
            <div className="space-y-6">
              <h2 className="text-4xl font-bold">Why A-Share is Different</h2>
              <p className="text-lg text-muted-foreground">
                In a landscape of traditional universities, expensive bootcamps,
                and ineffective online courses, here's what sets us apart:
              </p>
            </div>
          </FadeInOnScroll>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Pragmatic, Not Idealistic",
                description:
                  "We work with existing resources and systems. We scale rapidly while others plan. We deliver results over perfect theory.",
              },
              {
                title: "Locally-Rooted, Globally-Competitive",
                description:
                  "Content respects African context and realities while meeting international quality standards. No imported curriculum that doesn't fit.",
              },
              {
                title: "Employment-Obsessed",
                description:
                  "We don't just award certificates. We track employment outcomes. We partner with employers. Success = graduates earning sustainable income.",
              },
              {
                title: "Community-Strengthening",
                description:
                  "Revenue shared with local partners. Infrastructure partners benefit directly. We invest in communities, not extract from them.",
              },
              {
                title: "Continuously Evolving",
                description:
                  "Curriculum updates quarterly based on market demand, student outcomes, and employer feedback. We adapt faster than traditional institutions.",
              },
              {
                title: "Affordability Without Compromise",
                description:
                  "Quality education at 1/10th the cost of private universities. Affordable payment plans. No student debt. Accessibility for all income levels.",
              },
            ].map((reason, index) => (
              <FadeInOnScroll key={index} delay={index * 150}>
                <Card className="border-border/50 bg-background hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      {reason.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {reason.description}
                    </p>
                  </CardContent>
                </Card>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Commitment Section */}
      <section className="py-24 px-4 md:px-8 bg-secondary/30">
        <div className="max-w-4xl mx-auto space-y-12">
          <FadeInOnScroll>
            <div className="space-y-8">
              <h2 className="text-4xl font-bold">Our Commitment to You</h2>
              <p className="text-lg text-muted-foreground">
                When you choose A-Share, you're investing in more than a course.
                You're joining a movement to democratize opportunity. Here's
                what we commit to:
              </p>

              <div className="space-y-4">
                {[
                  "Quality that rivals international standards, delivered locally and affordably",
                  "Direct pathways to employment through partnerships with real employers",
                  "Instructors who are active practitioners in their fields, not just academics",
                  "Continuous support: mentorship, job placement assistance, and community connection",
                  "Transparency: we publish employment outcomes and student stories",
                  "Affordability: if you can't afford a course, we'll find a way to include you",
                  "Respect for your potential: we believe in you before you believe in yourself",
                ].map((commitment, index) => (
                  <FadeInOnScroll key={index} delay={index * 100}>
                    <div className="flex gap-3 items-start">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                      <p className="text-muted-foreground">{commitment}</p>
                    </div>
                  </FadeInOnScroll>
                ))}
              </div>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 md:px-8 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <FadeInOnScroll>
            <h2 className="text-4xl font-bold">
              Ready to Transform Your Future?
            </h2>
            <p className="text-lg opacity-95">
              Whether you're ready to start learning, interested in partnership,
              or want to support this movement—there's a place for you at
              A-Share. Your success is our mission.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                className={`${buttonVariants({
                  size: "lg",
                  variant: "secondary",
                })} group`}
                href="/courses"
              >
                Explore Our Courses
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                className={`${buttonVariants({
                  size: "lg",
                  variant: "outline",
                })} text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10`}
                href="/login"
              >
                Get Started Today
              </Link>
            </div>
          </FadeInOnScroll>
        </div>
      </section>
    </>
  );
}
