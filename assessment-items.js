/* Original draft instrument for demo preview; not validated for research use. */
window.UTAS_ASSESSMENT = {
  "title": "UTAS-Ibra Student Feedback",
  "instrumentVersion": "utas-cyberlab-draft-2.0",
  "previewNotice": "Draft preview only. This is not research enrollment. Practice answers stay in this browser tab for this session and are not submitted for research. Do not enter names, student IDs, email addresses, passwords, or other identifying information.",
  "perceivedInstructions": "How well do you understand each general cybersecurity learning outcome right now?",
  "perceivedScale": [
    {
      "value": 1,
      "label": "Not at all"
    },
    {
      "value": 2,
      "label": "Slightly"
    },
    {
      "value": 3,
      "label": "Moderately"
    },
    {
      "value": 4,
      "label": "Very well"
    },
    {
      "value": 5,
      "label": "Extremely well"
    }
  ],
  "perceivedKnowledge": [
    {
      "id": "pk_general_1",
      "text": "Understanding core cybersecurity concepts"
    },
    {
      "id": "pk_general_2",
      "text": "Recognizing potential risks in digital situations"
    },
    {
      "id": "pk_general_3",
      "text": "Explaining why a digital action may be safe or unsafe"
    },
    {
      "id": "pk_general_4",
      "text": "Choosing appropriate actions to protect information and accounts"
    },
    {
      "id": "pk_general_5",
      "text": "Applying cybersecurity knowledge to unfamiliar situations"
    },
    {
      "id": "pk_general_6",
      "text": "Understanding the possible consequences of unsafe digital behavior"
    },
    {
      "id": "pk_general_7",
      "text": "Knowing when to seek help or report a security concern"
    },
    {
      "id": "pk_general_8",
      "text": "Explaining safe digital practices to another person"
    }
  ],
  "objectiveInstructions": "Choose the single best answer. Select “I don’t know” rather than guessing if you are unsure. You may skip any question. These general questions do not depend on completing a particular activity.",
  "objective": [
    {
      "id": "k01_general",
      "prompt": "An unexpected message says your account will close today unless you sign in through its link. What is the safest next step?",
      "options": [
        "Use the link because the request is urgent",
        "Open the service’s known website independently and check through an official channel",
        "Reply with your account details",
        "Trust the message if it includes a familiar logo",
        "I don’t know"
      ],
      "correctIndex": 1,
      "explanation": "Urgency and familiar branding do not establish authenticity. Check independently using a known official website or contact channel."
    },
    {
      "id": "k02_general",
      "prompt": "Which approach best protects several online accounts?",
      "options": [
        "Use one complex password for every account",
        "Use a personal identifier with a different final digit for each account",
        "Use long, unique passwords generated and stored by a reputable password manager",
        "Use short passwords and change them every day",
        "I don’t know"
      ],
      "correctIndex": 2,
      "explanation": "Long, unique passwords reduce guessing and password-reuse risks. A reputable password manager can help generate and store them."
    },
    {
      "id": "k03_general",
      "prompt": "You receive an unexpected file attachment from someone you know. What should you do before opening it?",
      "options": [
        "Confirm the request through a separate trusted channel if it seems unusual",
        "Open it because the sender’s name is familiar",
        "Enable every feature the file requests",
        "Forward it to others so they can check it first",
        "I don’t know"
      ],
      "correctIndex": 0,
      "explanation": "Familiar accounts can be impersonated or compromised. Independently verify unusual files or requests before acting."
    },
    {
      "id": "k04_general",
      "prompt": "Someone contacts you claiming to be support and asks for a one-time sign-in code you just received. What is the safest response?",
      "options": [
        "Share it if they know your name",
        "Post it in a group chat to ask for advice",
        "Share it quickly because the code expires",
        "Do not share it; contact the service through a known official channel",
        "I don’t know"
      ],
      "correctIndex": 3,
      "explanation": "A sign-in code can grant access to an account. Do not disclose it to an unexpected caller or message sender."
    },
    {
      "id": "k05_general",
      "prompt": "You need to install a security update. Which source is the safest choice?",
      "options": [
        "A download link in an unexpected pop-up",
        "The application’s built-in updater or the vendor’s verified official source",
        "The first advertisement in a search result",
        "Any file with the product’s logo",
        "I don’t know"
      ],
      "correctIndex": 1,
      "explanation": "Use trusted built-in update mechanisms or verified official sources. Names, logos and advertisements alone do not verify a download."
    },
    {
      "id": "k06_general",
      "prompt": "A digital service requests access to information that is unrelated to the feature you want to use. What is the best default response?",
      "options": [
        "Grant all requested access so the service works faster",
        "Allow it because the service is popular",
        "Deny unnecessary access and check what the feature actually needs",
        "Allow it once because temporary access cannot expose information",
        "I don’t know"
      ],
      "correctIndex": 2,
      "explanation": "Limit access to what is necessary for a trusted activity. Even temporary access can expose information."
    },
    {
      "id": "k07_general",
      "prompt": "Before sharing a document online, what is the best information-protection practice?",
      "options": [
        "Check who needs access and remove information they do not need",
        "Make it public so recipients can find it easily",
        "Include every personal detail in case it becomes useful later",
        "Assume a long link prevents other people from accessing it",
        "I don’t know"
      ],
      "correctIndex": 0,
      "explanation": "Share the minimum information needed with the intended audience. A difficult-to-guess link is not a substitute for appropriate access controls."
    },
    {
      "id": "k08_general",
      "prompt": "A website uses an encrypted connection. Which statement is correct?",
      "options": [
        "Every claim on the website must be true",
        "The website can never be compromised",
        "It is safe to provide any information the website requests",
        "Encryption protects the connection, but the website’s identity and request still need checking",
        "I don’t know"
      ],
      "correctIndex": 3,
      "explanation": "Connection encryption protects data in transit. It does not by itself establish the trustworthiness of the organization or the request."
    },
    {
      "id": "k09_general",
      "prompt": "You notice unexpected activity on one of your accounts. What is the most appropriate next step?",
      "options": [
        "Ignore it if you can still sign in",
        "Use the service’s known official security or recovery channel and follow its guidance",
        "Share your password with a stranger who offers help",
        "Follow any recovery link sent by the same unknown contact",
        "I don’t know"
      ],
      "correctIndex": 1,
      "explanation": "Use trusted official channels to investigate and recover an account. Avoid disclosing credentials or following unverified recovery links."
    },
    {
      "id": "k10_general",
      "prompt": "You are unsure whether an unfamiliar digital action is safe. What is the best general approach?",
      "options": [
        "Proceed quickly to avoid inconvenience",
        "Copy what an unknown online commenter recommends",
        "Pause, verify the source and purpose, and seek trusted guidance when needed",
        "Disable security warnings so the action can continue",
        "I don’t know"
      ],
      "correctIndex": 2,
      "explanation": "Pausing to verify the source, purpose and consequences helps avoid preventable mistakes. Seek trusted guidance rather than bypassing safeguards."
    }
  ],
  "satisfactionInstructions": "Thinking about the learning experience you just completed, how much do you agree with each statement?",
  "satisfactionScale": [
    {
      "value": 1,
      "label": "Strongly disagree"
    },
    {
      "value": 2,
      "label": "Disagree"
    },
    {
      "value": 3,
      "label": "Neither agree nor disagree"
    },
    {
      "value": 4,
      "label": "Agree"
    },
    {
      "value": 5,
      "label": "Strongly agree"
    },
    {
      "value": null,
      "label": "Not applicable"
    }
  ],
  "satisfaction": [
    {
      "id": "s01_overall",
      "text": "Overall, I am satisfied with this learning experience.",
      "group": "Overall satisfaction"
    },
    {
      "id": "s02_navigation",
      "text": "It was easy to find my way around the application.",
      "group": "Usability"
    },
    {
      "id": "s03_instructions",
      "text": "The activity instructions were easy to understand.",
      "group": "Usability"
    },
    {
      "id": "s04_readability",
      "text": "The on-screen information was easy to read.",
      "group": "Usability"
    },
    {
      "id": "s05_feedback",
      "text": "The feedback clearly explained the result of my choices.",
      "group": "Learning support"
    },
    {
      "id": "s06_engagement",
      "text": "The activities held my attention.",
      "group": "Engagement"
    },
    {
      "id": "s07_difficulty",
      "text": "The level of challenge was appropriate for me.",
      "group": "Learning support"
    },
    {
      "id": "s08_relevance",
      "text": "The scenarios were relevant to situations I may encounter.",
      "group": "Perceived learning value"
    },
    {
      "id": "s09_value",
      "text": "The learning experience was useful for learning cybersecurity concepts.",
      "group": "Perceived learning value"
    },
    {
      "id": "s10_reuse",
      "text": "I would choose to use these learning activities for further practice.",
      "group": "Future-use intention"
    }
  ],
  "openPrompts": [
    {
      "id": "open_helpful",
      "text": "What helped your learning most, and why?",
      "optional": true,
      "maxLength": 1000
    },
    {
      "id": "open_improve",
      "text": "What was confusing, or what one change would improve the learning experience?",
      "optional": true,
      "maxLength": 1000
    }
  ],
  "openTextNotice": "Optional. Please do not include your name, student ID, email address, passwords, or identifying details about yourself or anyone else."
};
