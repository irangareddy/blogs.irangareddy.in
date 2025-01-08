import type { Site, SocialObjects } from "./types";

export const SITE: Site = {
  website: "https://blogs.irangareddy.in/",
  author: "Ranga Reddy Nukala",
  profile: "https://irangareddy.in/",
  desc: "Exploring iOS development, Swift best practices, and the intersection of mobile and AI. Written by a two-time WWDC winner and Senior iOS Engineer.",
  title: "Swift & Beyond | Ranga Reddy",
  ogImage: "ranga-dev-og.jpg", // You'll need to create this image
  lightAndDarkMode: true,
  postPerIndex: 6, // Showing more posts on the homepage
  postPerPage: 5, // More posts per page for better readability
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  editPost: {
    url: "https://github.com/irangareddy/blog/edit/main/src/content/blog",
    text: "Suggest Improvements",
    appendFilePath: true,
  },
  // Additional metadata for better SEO
  // keywords: [
  //   "iOS Development",
  //   "Swift",
  //   "SwiftUI",
  //   "Mobile Development",
  //   "Software Engineering",
  //   "WWDC",
  //   "Apple",
  //   "Tech Blog"
  // ],
  // defaultTheme: 'system', // Respect system preferences
  // language: "en-US",
  // Social sharing metadata
  // socialImage: "https://blogs.irangareddy.in/images/social-card.jpg",
  // twitterHandle: "@irangareddy",
};

export const LOCALE = {
  lang: "en", // html lang code. Set this empty and default will be "en"
  langTag: ["en-EN"], // BCP 47 Language Tags. Set this empty [] to use the environment default
} as const;

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46,
};

export const SOCIALS: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/irangareddy",
    linkTitle: ` ${SITE.title} on Github`,
    active: true,
  },
  {
    name: "X",
    href: "https://x.com/irangareddy",
    linkTitle: `${SITE.title} on X`,
    active: true,
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/irangareddy/",
    linkTitle: `${SITE.title} on Instagram`,
    active: true,
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com/in/irangareddy",
    linkTitle: `${SITE.title} on LinkedIn`,
    active: true,
  },
];
