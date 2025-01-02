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
  {
    name: "Mail",
    href: "mailto:yourmail@gmail.com",
    linkTitle: `Send an email to ${SITE.title}`,
    active: false,
  },
  {
    name: "X",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on X`,
    active: false,
  },
  {
    name: "Twitch",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Twitch`,
    active: false,
  },
  {
    name: "YouTube",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on YouTube`,
    active: false,
  },
  {
    name: "WhatsApp",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on WhatsApp`,
    active: false,
  },
  {
    name: "Snapchat",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Snapchat`,
    active: false,
  },
  {
    name: "Pinterest",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Pinterest`,
    active: false,
  },
  {
    name: "TikTok",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on TikTok`,
    active: false,
  },
  {
    name: "CodePen",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on CodePen`,
    active: false,
  },
  {
    name: "Discord",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Discord`,
    active: false,
  },
  {
    name: "GitLab",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on GitLab`,
    active: false,
  },
  {
    name: "Reddit",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Reddit`,
    active: false,
  },
  {
    name: "Skype",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Skype`,
    active: false,
  },
  {
    name: "Steam",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Steam`,
    active: false,
  },
  {
    name: "Telegram",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Telegram`,
    active: false,
  },
  {
    name: "Mastodon",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Mastodon`,
    active: false,
  },
];
