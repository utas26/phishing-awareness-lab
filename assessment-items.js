/* Original draft instrument for demo preview; not validated for research use. */
window.UTAS_ASSESSMENT = {
  "title": "UTAS-Ibra Student Feedback",
  "instrumentVersion": "utas-cyberlab-draft-1.0",
  "previewNotice": "Draft preview only. This is not research enrollment. Practice answers stay in this browser tab for this session and are not submitted for research. Do not enter names, student IDs, email addresses, passwords, or other identifying information.",
  "perceivedInstructions": "How well do you understand each topic right now?",
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
      "id": "pk_phishing",
      "text": "Recognizing phishing messages"
    },
    {
      "id": "pk_passwords",
      "text": "Choosing strong password practices"
    },
    {
      "id": "pk_qr",
      "text": "Checking whether a QR-code destination is trustworthy"
    },
    {
      "id": "pk_mfa",
      "text": "Responding safely to unexpected MFA approval requests"
    },
    {
      "id": "pk_updates",
      "text": "Distinguishing legitimate software updates from fake update prompts"
    },
    {
      "id": "pk_permissions",
      "text": "Deciding whether a website needs a requested browser permission"
    },
    {
      "id": "pk_urls",
      "text": "Identifying the actual website in a suspicious URL"
    },
    {
      "id": "pk_network",
      "text": "Interpreting discovery and port-scan results in an authorized virtual network"
    }
  ],
  "objectiveInstructions": "Choose the single best answer. Select “I don't know” rather than guessing if you are unsure. You may skip any question. All network examples refer to an authorized simulation.",
  "objective": [
    {
      "id": "k01_phishing",
      "prompt": "An unexpected email says your university account will close today unless you sign in through its link. What is the safest next step?",
      "options": [
        "Use the link because the message is urgent",
        "Open the university's known website independently and check through an official channel",
        "Reply to the sender with your login details",
        "Trust the message if it includes the university logo",
        "I don't know"
      ],
      "correctIndex": 1,
      "explanation": "Urgency and logos do not establish authenticity. Independently reach a known official website or contact channel; do not rely on the message's link."
    },
    {
      "id": "k02_passwords",
      "prompt": "Which approach best protects several online accounts?",
      "options": [
        "Use one complex password for every account",
        "Use your student number with a different final digit for each account",
        "Use long, unique passwords generated and stored by a reputable password manager",
        "Use short passwords and change them every day",
        "I don't know"
      ],
      "correctIndex": 2,
      "explanation": "Long, unique passwords reduce guessing and password-reuse risks. A reputable password manager can help generate and store them."
    },
    {
      "id": "k03_qr",
      "prompt": "A QR code on a poster opens a page asking you to sign in. What should you do before entering credentials?",
      "options": [
        "Check the destination and use a known official route if the request is unexpected",
        "Assume a printed QR code has been verified",
        "Enter credentials if the page design looks familiar",
        "Trust it automatically if the link uses HTTPS",
        "I don't know"
      ],
      "correctIndex": 0,
      "explanation": "QR codes can lead to spoofed websites. A familiar design or HTTPS alone does not prove the site is the intended service."
    },
    {
      "id": "k04_mfa",
      "prompt": "You receive repeated MFA approval requests, but you are not trying to sign in. What is the best response?",
      "options": [
        "Approve one request so the alerts stop",
        "Share an approval code with anyone claiming to be support",
        "Disable MFA immediately to avoid more alerts",
        "Deny the requests and report them through the service's known security channel",
        "I don't know"
      ],
      "correctIndex": 3,
      "explanation": "Unexpected repeated requests can be an MFA-fatigue attack. Do not approve a sign-in you did not initiate; report it through a trusted channel."
    },
    {
      "id": "k05_updates",
      "prompt": "While browsing an unrelated website, a pop-up says you must install a browser update from its download button. What is the safest action?",
      "options": [
        "Install it immediately because updates are important",
        "Dismiss the prompt and check updates through the browser's built-in settings or official source",
        "Disable browser updates permanently",
        "Install it if the pop-up uses the browser's logo",
        "I don't know"
      ],
      "correctIndex": 1,
      "explanation": "Updates are important, but an unrelated website's prompt may be deceptive. Use the application's built-in updater or its official source."
    },
    {
      "id": "k06_permissions",
      "prompt": "A website asks for microphone access when you only want to read an article. What is the best default response?",
      "options": [
        "Allow it because every website needs microphone access",
        "Allow it if the website uses HTTPS",
        "Deny it unless a feature you choose has a clear, trusted need for it",
        "Allow it once because temporary access cannot expose information",
        "I don't know"
      ],
      "correctIndex": 2,
      "explanation": "Grant permissions only when a trusted feature needs them. Reading an article normally does not require microphone access."
    },
    {
      "id": "k07_urls",
      "prompt": "The real service uses accounts.example.edu. A message links to https://accounts.example.edu.verify-login.example/sign-in. Which statement is correct?",
      "options": [
        "The address belongs to verify-login.example, so it is not the stated official host",
        "The address is official because it begins with accounts.example.edu",
        "The address is official because it contains a sign-in path",
        "HTTPS proves the address belongs to the university",
        "I don't know"
      ],
      "correctIndex": 0,
      "explanation": "The hostname ends in verify-login.example; the familiar text appears in its subdomain. HTTPS protects a connection but does not establish that the site is the intended organization."
    },
    {
      "id": "k08_ports",
      "prompt": "An authorized simulated scan reports TCP port 443 as open. What does that establish?",
      "options": [
        "The host has definitely been compromised",
        "The service has a known exploitable vulnerability",
        "The service is automatically safe because 443 is commonly used for HTTPS",
        "A service is accepting connections on that port; its security needs separate assessment",
        "I don't know"
      ],
      "correctIndex": 3,
      "explanation": "An open port indicates a listening service from the scanner's perspective. It alone proves neither compromise, vulnerability, nor safety."
    },
    {
      "id": "k09_subnet",
      "prompt": "Your authorized virtual lab range is 192.0.2.0/24. Which target is inside that range?",
      "options": [
        "192.0.3.37",
        "192.0.2.37",
        "198.51.100.37",
        "203.0.113.37",
        "I don't know"
      ],
      "correctIndex": 1,
      "explanation": "A /24 IPv4 prefix fixes the first three octets here, so 192.0.2.37 is within 192.0.2.0/24. Keep activity within the approved lab scope."
    },
    {
      "id": "k10_discovery",
      "prompt": "Within an approved virtual lab, how does host discovery differ from port scanning?",
      "options": [
        "Host discovery changes IP addresses; port scanning changes passwords",
        "They always produce identical information",
        "Host discovery looks for responding hosts; port scanning checks the state of service ports",
        "Host discovery proves every host is secure; port scanning proves every host is vulnerable",
        "I don't know"
      ],
      "correctIndex": 2,
      "explanation": "Host discovery identifies hosts that respond to its probes; port scanning investigates port states. Nonresponse may reflect filtering, so discovery can miss active hosts."
    }
  ],
  "satisfactionInstructions": "Thinking about the lab you just completed, how much do you agree with each statement?",
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
      "text": "Overall, I am satisfied with this lab experience.",
      "group": "Overall satisfaction"
    },
    {
      "id": "s02_navigation",
      "text": "It was easy to find my way around the lab.",
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
      "text": "The lab was useful for learning cybersecurity concepts.",
      "group": "Perceived learning value"
    },
    {
      "id": "s10_reuse",
      "text": "I would choose to use these simulations for further practice.",
      "group": "Future-use intention"
    }
  ],
  "openPrompts": [
    {
      "id": "open_helpful",
      "text": "Which activity or explanation was most helpful, and why?",
      "optional": true,
      "maxLength": 1000
    },
    {
      "id": "open_improve",
      "text": "What was confusing, or what one change would improve the lab?",
      "optional": true,
      "maxLength": 1000
    }
  ],
  "openTextNotice": "Optional. Please do not include your name, student ID, email address, passwords, or identifying details about yourself or anyone else."
};
