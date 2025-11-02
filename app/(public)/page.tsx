import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface featureProps {
  title: string;
  description: string;
  icon: string;
}

const features: featureProps[] = [
  {
    title: "Access Learning Spaces",
    description:
      "We transform existing spaces-community centers into modern training hubs, minimizing costs and ensuring everyone can access education close to home.",
    icon: "🏛️",
  },
  {
    title: "Innovative Learning Methods",
    description:
      "Our training programs are hands on, deeply connected to cameroonian realities, and designed to build real world skills that lead  directly to meaningful careers.",
    icon: "💡",
  },

  {
    title: "Strategic Partnerships",
    description:
      "We collaborate with businesses, schools, and NGOs to provide internships, scholarships, and co-certified diplomas creating a bridge from learning to employment.",
    icon: "🤝",
  },

  {
    title: "Learning Communities",
    description:
      "We're building a vibrant pan-Cameroonian network where learners, educators, and partners connect, collaborate, and grow together toward a shared future",
    icon: "🌍",
  },
];

export default function Home() {
  return (
    <>
      <section className="relative py-20">
        <div className="flex flex-col items-center text-center space-y-8">
          <Badge variant={"outline"}>
            We believe that quality education should be within everyone’s reach
            — unlocking potential, inspiring innovation, and building the
            Cameroon of tomorrow.
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Empowering Education Through Cameroon
          </h1>
          <p className="max-w-[700px] text-muted-foreground md:text-xl">
            A-share stands as a transformative movement for education in
            Cameroon. By removing geographical and economic barriers, we make
            global-quality learning accessible to all, empowering youth and
            adults alike to grow and succeed.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              className={buttonVariants({
                size: "lg",
                variant: "outline",
              })}
              href="/courses"
            >
              Explore Courses
            </Link>

            <Link
              className={buttonVariants({
                size: "lg",
              })}
              href="/login"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-32">
        {features.map((feature, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow p-6">
            <CardHeader>
              <div className="text-4xl mb-4">{feature.icon}</div>
              <CardTitle>{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}
