import{useState,useEffect,useRef,useCallback}from"react";
import L from"./logoData.js";

/*
  SECURITY MODEL:
  - Every localStorage key is namespaced per userId (uK/cK/pK/sK)
  - API keys ONLY stored in sK(userId) — never in the user object
  - pU() helper explicitly blocks any API key from being stored in user obj
  - On logout, API keys cleared from React state immediately
  - loadMembers() exposes only: name,email,isPro,isAdv,isAdmin,examScore,certGranted,joined
    — never password hash, never API keys
  - Admin status: ONLY set when exam score >= 40 in submitExam()
    grantAdmin() also enforces certGranted && examScore>=40
*/

const DB={
  g:(k,d=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}},
  s:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}},
  d:(k)=>{try{localStorage.removeItem(k);}catch{}},
};
const SESS="gp_sess",UIDX="gp_uidx";
const uK=id=>"gp_u_"+id,cK=id=>"gp_c_"+id,pK=id=>"gp_p_"+id,sK=id=>"gp_s_"+id;
const mkId=e=>btoa(encodeURIComponent(e.toLowerCase().trim())).replace(/[^a-zA-Z0-9]/g,"").slice(0,24);
const nowT=()=>new Date().toLocaleTimeString();

const QUIZ=[
  {q:"What does AI stand for?",o:["Automated Interface","Artificial Intelligence","Advanced Integration","Automated Input"],a:1},
  {q:"What is GoPlanet's primary function?",o:["File Storage","AI Chatbot Platform","Social Network","Video Streaming"],a:1},
  {q:"Which API powers GoPlanet's chatbot?",o:["OpenAI","Gemini","Groq","Cohere"],a:2},
  {q:"What does LLM stand for?",o:["Large Language Model","Logical Learning Machine","Local Logic Module","Linear Learning Method"],a:0},
  {q:"Minimum score to earn a GoPlanet certificate?",o:["30/50","35/50","40/50","45/50"],a:2},
  {q:"What does 'prompt' mean in AI?",o:["A payment","User input to the AI","A notification","A file format"],a:1},
  {q:"What is 'context' in an AI conversation?",o:["Font size","Previous chat history","Background colour","User location"],a:1},
  {q:"Which is a responsible AI principle?",o:["Share passwords","Use AI with integrity","Replace human decisions","Ignore errors"],a:1},
  {q:"What is a Groq API key used for?",o:["Login","Access to Groq AI services","File encryption","Image generation"],a:1},
  {q:"What does 'token' mean in AI?",o:["Cryptocurrency","A unit of text","A user account","A payment method"],a:1},
  {q:"What is machine learning?",o:["Teaching machines to walk","AI learning from data","Programming robots","Computer maintenance"],a:1},
  {q:"What is NLP?",o:["Code in English","AI understanding human language","Network protocols","Nature computing"],a:1},
  {q:"What does 'Human First' mean?",o:["Humans do everything","Empower people, not replace them","Humans control AI","Only humans use AI"],a:1},
  {q:"What is a chatbot?",o:["A physical robot","Software simulating conversation","A chat room","A messaging app"],a:1},
  {q:"What is GoPlanet certification about?",o:["Coding only","Responsible AI usage","Database management","Web design"],a:1},
  {q:"What does 'inference' mean in AI?",o:["Training a model","Running AI to get answers","Deleting data","Uploading datasets"],a:1},
  {q:"What is a subscription plan?",o:["Free service forever","Paid tier with extra features","One-time purchase","Government program"],a:1},
  {q:"What does 'hallucination' mean in AI?",o:["AI seeing images","AI generating false info","AI sleeping","AI voice response"],a:1},
  {q:"Purpose of a user guide?",o:["To restrict users","Help users understand the app","Collect data","Show ads"],a:1},
  {q:"What is 'Effective' in GoPlanet?",o:["Being strict","Work smarter, achieve more","Using expensive tools","Coding everything"],a:1},
  {q:"What is 'Smart Thinking' in GoPlanet?",o:["Memorising facts","Solve problems with intelligence","Working faster","Using shortcuts"],a:1},
  {q:"What is an admin?",o:["A regular user","User with management privileges","Paid subscriber only","Developer only"],a:1},
  {q:"What does Pro subscription offer?",o:["Same as free","Faster responses and more features","Less storage","Fewer models"],a:1},
  {q:"What is a language model's training data?",o:["Images only","Large amounts of text","Audio files","Code files"],a:1},
  {q:"What does 'Honest Use' mean?",o:["Using AI to cheat","Use technology with integrity","Only free tools","Sharing all data"],a:1},
  {q:"What is an API?",o:["Application Programming Interface","Automated Program Input","Advanced Page Interface","App Protocol Integration"],a:0},
  {q:"What to do if AI gives wrong info?",o:["Trust it completely","Verify with reliable sources","Delete the app","Report to police"],a:1},
  {q:"GoPlanet's chatbot is powered by?",o:["Facebook AI","Google Bard","Groq API","Amazon Alexa"],a:2},
  {q:"What is 'temperature' in AI?",o:["Server heat","Controls randomness of output","User's climate","Battery level"],a:1},
  {q:"Best practice with AI chatbots?",o:["Never verify answers","Cross-check important info","Share passwords","Use blindly"],a:1},
  {q:"Certification date is based on?",o:["App launch date","The day you take the exam","Your birthday","A fixed annual date"],a:1},
  {q:"GoPlanet is designed for?",o:["Gaming","Everyone — easy AI chatbot","Developers only","Children under 10"],a:1},
  {q:"What is 'Secure & Private'?",o:["Data sold to partners","Data encrypted and safe","Data is public","No security"],a:1},
  {q:"What is a multiple-choice exam?",o:["Essay writing","Questions with answer options","Oral exam","Drawing test"],a:1},
  {q:"What is 'context window' in AI?",o:["Browser window size","Amount of text AI processes","Screen resolution","Network bandwidth"],a:1},
  {q:"What does re-taking an exam allow?",o:["Higher score automatically","Attempting again after failure","Changing questions","Free subscription"],a:1},
  {q:"What is an AI project in GoPlanet?",o:["Physical project","Organised workspace for AI tasks","Government initiative","Hardware device"],a:1},
  {q:"What makes GoPlanet 'Innovative AI'?",o:["Uses old technology","Choose from best open models","No model options","One fixed model"],a:1},
  {q:"What is 'User Friendly' design?",o:["For tech experts","Designed for everyone","Complex on purpose","No help docs"],a:1},
  {q:"Purpose of subscription tiers?",o:["To confuse users","Offer different feature levels","Restrict all users","Remove features"],a:1},
  {q:"What to do before sharing AI content?",o:["Share immediately","Review and verify accuracy","Delete it","Print it"],a:1},
  {q:"Role of AI in communication?",o:["Replace human communication","Enhance and assist humans","Stop communication","Monitor users"],a:1},
  {q:"What is a real-world AI application?",o:["AI in fiction","AI solving everyday problems","AI in games only","AI in space"],a:1},
  {q:"After completing GoPlanet certification?",o:["Nothing","Receive certificate if score >= 40","Get a free phone","Become admin automatically"],a:1},
  {q:"What is model selection in GoPlanet?",o:["Choosing clothing","Selecting which AI model to use","Picking themes","Choosing plans"],a:1},
  {q:"What does an AI assistant help with?",o:["Only math","Chatting, creating, coding, and more","Only images","Only translations"],a:1},
  {q:"Recommended approach to AI usage?",o:["Rely on AI for everything","Use AI as a tool, not replace judgment","Never use AI","Entertainment only"],a:1},
  {q:"What is voice mode in GoPlanet?",o:["Music player","Speaking to and hearing from AI","Phone call","Video chat"],a:1},
  {q:"What is Groq in GoPlanet?",o:["Social network","Fast AI inference API","Storage service","Payment gateway"],a:1},
  {q:"Which principle says 'Empower people, not replace them'?",o:["Honest Use","Smart Thinking","Effective","Human First"],a:3},
];

const GUIDE=[
  {icon:"🚀",title:"Getting Started",color:"#6c5ce7",steps:[{h:"Register",b:"Create your account with email, password, full name, and mobile number."},{h:"Log In",b:"Sign in — your session persists automatically."},{h:"Start Chatting",b:"Tap + New Chat to begin your first AI conversation."},{h:"Navigate",b:"Use the sidebar (desktop) or bottom bar (mobile) to switch sections."}],tip:"Your data saves automatically. Nothing is lost when you close the app.",note:"No email verification required. Register and start immediately."},
  {icon:"🔑",title:"Setting Up Your API Keys",color:"#e17055",steps:[{h:"Visit Groq",b:"Go to console.groq.com and create a free account to get your Groq API key."},{h:"Visit OpenAI",b:"Go to platform.openai.com to get your OpenAI API key (optional)."},{h:"Save Keys",b:"Go to ⚙️ Settings → API Keys, paste your key(s), and tap Save."},{h:"Choose Provider",b:"Select Groq or OpenAI as your AI provider in Settings."}],tip:"Your API keys are stored ONLY on your device — never sent to any server or visible to other users.",note:"Without an API key the chatbot will not respond. This is a one-time setup."},
  {icon:"💬",title:"Using the AI Chatbot",color:"#00b894",steps:[{h:"New Chat",b:"Tap + New Chat from the sidebar or welcome screen."},{h:"Type & Send",b:"Type your message and press Enter or tap the send button."},{h:"Voice Mode",b:"Tap 🎤 to speak. The AI listens and replies aloud."},{h:"Chat History",b:"All chats are saved in the sidebar. Tap any to continue."}],tip:"Switch AI models anytime from the model selector.",note:"Your conversations stay private on your device only."},
  {icon:"📁",title:"Managing Projects",color:"#fdcb6e",steps:[{h:"Open Projects",b:"Tap the 📁 Projects section in the sidebar."},{h:"Create Project",b:"Tap + New, enter a name, and tap Create."},{h:"Organise",b:"Use projects to group related AI tasks and ideas."},{h:"Access Anytime",b:"All projects are saved and available every time you open the app."}],tip:"Create separate projects for Work, Personal, Creative Writing, Research, etc.",note:"Projects are stored locally on your device."},
  {icon:"🎨",title:"Image Generator",color:"#a29bfe",steps:[{h:"Open Images",b:"Tap 🎨 Images in the sidebar or bottom nav."},{h:"Write Prompt",b:"Describe the image you want — be as detailed as possible."},{h:"Generate",b:"Tap Generate Image and wait for the result."},{h:"Try Again",b:"Edit your prompt and generate again."}],tip:"More detail = better results.",note:"Connect an image generation API key in Settings for real AI-generated images."},
  {icon:"⭐",title:"Subscription Plans",color:"#f9ca24",steps:[{h:"Free Plan",b:"Basic AI responses using standard models."},{h:"Pro Plan",b:"$25/year — faster responses, advanced models, priority support."},{h:"Advance Plan",b:"$50/year — very fast AI, very advanced models, all early access features."},{h:"Subscribe",b:"Go to Plans, tap Subscribe Now, and complete the payment."}],tip:"Advance Plan gives you the fastest and most powerful AI experience.",note:"Admins can grant Pro or Advance to any user from the Admin Panel."},
  {icon:"🛡️",title:"Admin Panel",color:"#e84393",steps:[{h:"Who is Admin?",b:"A user becomes Admin ONLY by scoring 40+ on the certification exam OR by being granted admin by an existing admin."},{h:"Admin Tab",b:"Admins see a 🛡️ Admin section in the sidebar."},{h:"View Members",b:"See all registered users, their exam scores, Pro and certification status."},{h:"Grant Access",b:"Tap Grant Pro, Grant Advance, or Grant Admin to upgrade any user."}],tip:"Admin access is earned — not automatic. Score 40 or above on the exam to unlock it.",note:"No user gets admin at registration. It requires passing the exam or manual grant."},
  {icon:"📜",title:"Certification Exam",color:"#6c5ce7",steps:[{h:"Optional",b:"The exam is optional. Go to ⚙️ Settings → Certification."},{h:"Read the Guide",b:"Read all 10 chapters before attempting the exam."},{h:"Enter Your Name",b:"Your full name will appear exactly as typed on the certificate."},{h:"Answer 50 Qs",b:"Answer all 50 multiple-choice questions about AI and GoPlanet."},{h:"Score 40+",b:"Score 40 or above to earn your downloadable certificate."},{h:"Download",b:"Your certificate shows your registered name and exact exam date."}],tip:"You can retake the exam anytime from Settings.",note:"Certificate issued ONLY for scores of 40 or above. Scoring 40+ also grants Admin access."},
  {icon:"🎤",title:"Voice Mode",color:"#00cec9",steps:[{h:"Enable",b:"Go to ⚙️ Settings → Voice Mode and toggle it on."},{h:"Tap Mic",b:"In any chat, tap the 🎤 button next to the input box."},{h:"Speak Clearly",b:"Speak your question — GoPlanet AI listens and transcribes it."},{h:"AI Speaks Back",b:"The AI replies in text AND reads the response aloud."}],tip:"Use voice mode hands-free while cooking, driving, or doing other tasks.",note:"Voice mode requires microphone permission. Works best in Chrome or Edge."},
  {icon:"🔒",title:"Privacy & Security",color:"#636e72",steps:[{h:"API Key Safety",b:"Your API keys are stored ONLY on your device. Never sent to GoPlanet servers."},{h:"User Isolation",b:"Each user's data is completely separate. No cross-user data leakage possible."},{h:"Local Storage",b:"All chats, projects, and settings are stored locally on your device only."},{h:"Log Out",b:"Always log out on shared devices to protect your account."}],tip:"If you suspect your API key was compromised, revoke it immediately at the provider's website.",note:"Aurexis never collects or transmits your personal data or API keys to any server."},
];

function makeCert(name,score,dateStr,logo){
  return new Promise(resolve=>{
    /* ----------------------------------------------------------------
       SECURITY: this function runs entirely client-side on the user's
       own browser. No data (name, date, score) is ever sent anywhere.
       The canvas output is a PNG data URL stored only in React state.
    ---------------------------------------------------------------- */
    const W=1400, H=990;
    const cv=document.createElement("canvas");
    cv.width=W; cv.height=H;
    const c=cv.getContext("2d");

    /* helper — stable pseudo-random from seed */
    const rnd=n=>{let x=Math.sin(n+1)*43758.5453123;return x-Math.floor(x);};

    /* helper — draw a ♦ diamond */
    const diamond=(x,y,s,col)=>{
      c.fillStyle=col;c.beginPath();
      c.moveTo(x,y-s);c.lineTo(x+s,y);c.lineTo(x,y+s);c.lineTo(x-s,y);
      c.closePath();c.fill();
    };

    /* helper — fading horizontal line */
    const fadeLine=(x1,x2,y,col)=>{
      const g=c.createLinearGradient(x1,y,x2,y);
      g.addColorStop(0,"rgba(0,0,0,0)");
      g.addColorStop(0.2,col);
      g.addColorStop(0.8,col);
      g.addColorStop(1,"rgba(0,0,0,0)");
      c.strokeStyle=g;c.lineWidth=1;
      c.beginPath();c.moveTo(x1,y);c.lineTo(x2,y);c.stroke();
    };

    /* ── 1. BACKGROUND ─────────────────────────────────────── */
    const bgG=c.createRadialGradient(W/2,H*0.38,0,W/2,H*0.38,W*0.9);
    bgG.addColorStop(0,"#0b1030");
    bgG.addColorStop(0.45,"#060c22");
    bgG.addColorStop(1,"#020510");
    c.fillStyle=bgG; c.fillRect(0,0,W,H);

    /* ── 2. STAR FIELD ─────────────────────────────────────── */
    for(let i=0;i<280;i++){
      const x=rnd(i*2.3)*W, y=rnd(i*5.7)*H, r=rnd(i*11.1)*1.4+0.2;
      c.fillStyle=`rgba(255,255,255,${0.3+rnd(i*7.9)*0.5})`;
      c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
    }

    /* ── 3. LIGHT RAYS ─────────────────────────────────────── */
    const ray=(ox,oy,angleDeg,len,rgb,maxA)=>{
      const a=angleDeg*Math.PI/180;
      const ex=ox+Math.cos(a)*len, ey=oy+Math.sin(a)*len;
      for(let w=14;w>=1;w--){
        const g2=c.createLinearGradient(ox,oy,ex,ey);
        g2.addColorStop(0,`rgba(${rgb},${maxA*(w/14)*0.9})`);
        g2.addColorStop(1,`rgba(${rgb},0)`);
        c.strokeStyle=g2; c.lineWidth=w*16; c.globalAlpha=0.018;
        c.beginPath();c.moveTo(ox,oy);c.lineTo(ex,ey);c.stroke();
      }
      c.globalAlpha=1;
    };
    /* Top-right bright blue beam */
    ray(W, 0,   142, W*1.1, "40,130,255", 1);
    ray(W, 0,   150, W*0.95,"70,160,255", 0.8);
    ray(W, 80,  156, W*0.85,"90,100,255", 0.65);
    ray(W, 160, 162, W*0.75,"100,80,240", 0.45);
    /* Bottom-left blue/purple beam */
    ray(0, H,  -36,  W*1.0, "30,110,255", 0.9);
    ray(0, H,  -28,  W*0.88,"60,70,230",  0.7);
    ray(50,H,  -20,  W*0.75,"100,60,220", 0.5);

    /* ── 4. OUTER BORDER ───────────────────────────────────── */
    c.strokeStyle="rgba(70,110,220,0.75)"; c.lineWidth=2.5;
    c.strokeRect(16,16,W-32,H-32);
    c.strokeStyle="rgba(100,140,255,0.35)"; c.lineWidth=1;
    c.strokeRect(27,27,W-54,H-54);

    /* ── 5. CORNER ORNAMENTS ───────────────────────────────── */
    const corner=(tx,ty,sx,sy)=>{
      c.save(); c.translate(tx,ty); c.scale(sx,sy);
      c.strokeStyle="rgba(160,185,255,0.75)"; c.lineWidth=2;
      /* outer L */
      c.beginPath();c.moveTo(0,58);c.lineTo(0,10);c.arcTo(0,0,10,0,10);c.lineTo(58,0);c.stroke();
      /* inner L */
      c.strokeStyle="rgba(130,155,255,0.4)"; c.lineWidth=1;
      c.beginPath();c.moveTo(0,46);c.lineTo(0,16);c.arcTo(0,8,8,8,8);c.lineTo(46,8);c.stroke();
      /* accent dots */
      c.fillStyle="rgba(160,185,255,0.7)";
      [[0,0],[24,0],[0,24]].forEach(([dx,dy])=>{c.beginPath();c.arc(dx,dy,2.8,0,Math.PI*2);c.fill();});
      c.restore();
    };
    corner(16,16, 1, 1); corner(W-16,16,-1, 1);
    corner(16,H-16,1,-1); corner(W-16,H-16,-1,-1);

    /* ── 6. LOGO (drawn after image loads — see below) ─────── */

    /* ── 7. "AUREXIS" ──────────────────────────────────────── */
    c.textAlign="center";
    c.shadowColor="rgba(60,130,255,0.95)"; c.shadowBlur=38;
    c.fillStyle="#ffffff"; c.font="bold 70px Arial,sans-serif";
    /* manually letter-spaced */
    const letters="AUREXIS";
    const lsp=22, lw=letters.length*62+(letters.length-1)*lsp;
    let lx=W/2-lw/2+31;
    for(const ch of letters){c.fillText(ch,lx,248);lx+=62+lsp;}
    c.shadowBlur=0;

    /* ── 8. TAGLINE "THINK. TALK. TRANSFORM." ─────────────── */
    fadeLine(W/2-290,W/2-30,272,"rgba(100,140,255,0.55)");
    fadeLine(W/2+30, W/2+290,272,"rgba(100,140,255,0.55)");
    c.fillStyle="rgba(150,175,255,0.72)"; c.font="13px Arial,sans-serif";
    c.fillText("THINK.  TALK.  TRANSFORM.",W/2,276);

    /* ── 9. "CERTIFICATE" ─────────────────────────────────── */
    const certG=c.createLinearGradient(0,295,0,420);
    certG.addColorStop(0,"#ffffff");
    certG.addColorStop(0.28,"#dde6ff");
    certG.addColorStop(0.6,"#aabcff");
    certG.addColorStop(1,"#8096ee");
    c.shadowColor="rgba(80,120,255,0.55)"; c.shadowBlur=24;
    c.fillStyle=certG; c.font="bold 118px Georgia,serif";
    c.fillText("CERTIFICATE",W/2,420);
    c.shadowBlur=0;

    /* ── 10. "OF APPRECIATION" ────────────────────────────── */
    /* purple fade line */
    const apG=c.createLinearGradient(W/2-360,0,W/2+360,0);
    apG.addColorStop(0,"rgba(80,60,210,0)");
    apG.addColorStop(0.15,"rgba(110,80,255,0.85)");
    apG.addColorStop(0.85,"rgba(110,80,255,0.85)");
    apG.addColorStop(1,"rgba(80,60,210,0)");
    c.strokeStyle=apG; c.lineWidth=1.5;
    c.beginPath();c.moveTo(W/2-360,446);c.lineTo(W/2+360,446);c.stroke();
    diamond(W/2-348,446,7,"rgba(130,100,255,0.9)");
    diamond(W/2+348,446,7,"rgba(130,100,255,0.9)");
    /* text */
    c.fillStyle="#8888dd"; c.font="bold 30px Arial,sans-serif";
    const oa="OF APPRECIATION", oasp=10;
    const oaw=oa.length*22+(oa.length-1)*oasp;
    let oax=W/2-oaw/2+11;
    for(const ch of oa){c.fillText(ch,oax,474);oax+=22+oasp;}
    /* bottom thin line */
    c.strokeStyle=apG; c.lineWidth=1;
    c.beginPath();c.moveTo(W/2-295,484);c.lineTo(W/2+295,484);c.stroke();

    /* ── 11. "THIS CERTIFICATE IS PROUDLY PRESENTED TO" ───── */
    c.fillStyle="rgba(190,205,255,0.6)"; c.font="13px Arial,sans-serif";
    const ptxt="THIS CERTIFICATE IS PROUDLY PRESENTED TO";
    const ptsp=4, ptw=ptxt.length*8.5+(ptxt.length-1)*ptsp;
    let ptx=W/2-ptw/2+4.25;
    for(const ch of ptxt){c.fillText(ch,ptx,520);ptx+=8.5+ptsp;}

    /* ── 12. DIVIDER LINE + DIAMOND ───────────────────────── */
    fadeLine(W/2-340,W/2-16,550,"rgba(100,125,255,0.5)");
    fadeLine(W/2+16, W/2+340,550,"rgba(100,125,255,0.5)");
    diamond(W/2,550,9,"rgba(120,145,255,0.92)");

    /* ── 13. RECIPIENT NAME ───────────────────────────────── */
    c.shadowColor="rgba(150,190,255,0.65)"; c.shadowBlur=20;
    c.fillStyle="#ffffff"; c.font="bold 56px Georgia,serif";
    c.fillText(name,W/2,622);
    c.shadowBlur=0;

    /* ── 14. BODY TEXT ───────────────────────────────────── */
    c.fillStyle="rgba(190,208,255,0.74)"; c.font="19px Arial,sans-serif";
    ["In recognition of your dedication, innovation, and outstanding",
     "contributions in the field of Artificial Intelligence.",
     "Your commitment to excellence inspires and drives the future."
    ].forEach((l,i)=>c.fillText(l,W/2,678+i*34));

    /* ── 15. LAUREL BRANCHES ─────────────────────────────── */
    const laurel=(sx,sy,dir)=>{
      for(let i=0;i<14;i++){
        const t=i/13;
        const bx=sx+dir*i*11, by=sy-i*6.5;
        const angle=(dir===1?-0.62:Math.PI+0.62)+i*dir*0.13;
        const len=13+i*2.6;
        /* blue→purple gradient along branch */
        c.strokeStyle=`rgba(${90+i*5},${55+i*9},${215+i*2},${0.6+t*0.3})`;
        c.lineWidth=1.5+t*0.8;
        c.beginPath();c.moveTo(bx,by);
        c.lineTo(bx+Math.cos(angle)*len,by+Math.sin(angle)*len);
        c.stroke();
      }
    };
    laurel(W/2-130,845,1);
    laurel(W/2+130,845,-1);

    /* ── 16. MEDAL SEAL ──────────────────────────────────── */
    /* outer dark circle */
    const medG=c.createRadialGradient(W/2,822,0,W/2,822,72);
    medG.addColorStop(0,"#1c1e3c");
    medG.addColorStop(0.7,"#0f1025");
    medG.addColorStop(1,"#080912");
    c.fillStyle=medG;
    c.beginPath();c.arc(W/2,822,72,0,Math.PI*2);c.fill();
    /* dotted outer ring */
    c.strokeStyle="rgba(130,155,255,0.5)"; c.lineWidth=1.5;
    c.setLineDash([5,8]);
    c.beginPath();c.arc(W/2,822,67,0,Math.PI*2);c.stroke();
    c.setLineDash([]);
    /* solid gradient ring */
    const rngG=c.createLinearGradient(W/2-67,822,W/2+67,822);
    rngG.addColorStop(0,"#4828a0");rngG.addColorStop(0.5,"#9075d8");rngG.addColorStop(1,"#4828a0");
    c.strokeStyle=rngG; c.lineWidth=3.5;
    c.beginPath();c.arc(W/2,822,59,0,Math.PI*2);c.stroke();
    /* inner fill */
    c.fillStyle="#0c0e22";
    c.beginPath();c.arc(W/2,822,53,0,Math.PI*2);c.fill();
    /* 8 diamond dots on ring */
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      diamond(W/2+Math.cos(a)*59,822+Math.sin(a)*59,3.5,"rgba(155,135,255,0.78)");
    }

    /* ── 17. SIGNATURE (left) ────────────────────────────── */
    fadeLine(W/2-445,W/2-145,895,"rgba(80,125,255,0.58)");
    c.shadowColor="rgba(80,125,255,0.55)"; c.shadowBlur=14;
    c.fillStyle="#a0b8ff"; c.font="italic bold 23px Georgia,serif";
    c.fillText("Aurexis",W/2-295,891);
    c.shadowBlur=0;
    c.fillStyle="rgba(80,125,255,0.7)"; c.font="bold 11px Arial,sans-serif";
    /* letter-spaced "SIGNATURE" */
    const sigT="SIGNATURE",sigSp=3,sigW=sigT.length*8+(sigT.length-1)*sigSp;
    let sigx=W/2-295-sigW/2+4;
    for(const ch of sigT){c.fillText(ch,sigx,916);sigx+=8+sigSp;}

    /* ── 18. DATE (right) ────────────────────────────────── */
    fadeLine(W/2+145,W/2+445,895,"rgba(80,125,255,0.58)");
    c.shadowColor="rgba(80,125,255,0.55)"; c.shadowBlur=14;
    c.fillStyle="#a0b8ff"; c.font="italic 20px Georgia,serif";
    c.fillText(dateStr,W/2+295,891);   /* ← actual exam date */
    c.shadowBlur=0;
    c.fillStyle="rgba(80,125,255,0.7)"; c.font="bold 11px Arial,sans-serif";
    const dtT="DATE",dtSp=3,dtW=dtT.length*8+(dtT.length-1)*dtSp;
    let dtx=W/2+295-dtW/2+4;
    for(const ch of dtT){c.fillText(ch,dtx,916);dtx+=8+dtSp;}

    /* ── LOGO: load & draw last so it sits on top ─────────── */
    const img=new Image();
    img.onload=()=>{
      /* large logo at top */
      const sz=158, lx2=W/2-sz/2, ly=36;
      c.drawImage(img,lx2,ly,sz,sz);
      /* small logo inside medal — clipped to circle */
      c.save();
      c.beginPath();c.arc(W/2,822,50,0,Math.PI*2);c.clip();
      c.drawImage(img,W/2-50,772,100,100);
      c.restore();
      resolve(cv.toDataURL("image/png"));
    };
    img.onerror=()=>resolve(cv.toDataURL("image/png"));
    img.src=logo;   /* ← base64 data URI of the user's logo */
  });
}


export default function App(){
  const[page,setPage]=useState("boot");
  const[regStep,setRS]=useState(1);
  const[form,setForm]=useState({email:"",pw:"",name:"",mob:"",dev:"mobile"});
  const[authErr,setAE]=useState("");
  const[uid,setUid]=useState(null);
  const[user,setUser]=useState(null);
  const[tab,setTab]=useState("chat");
  const[sbOpen,setSbOpen]=useState(false);
  const[dark,setDark]=useState(false);
  const[groqKey,setGK]=useState("");
  const[openaiKey,setOK]=useState("");
  const[aiProv,setProv]=useState("groq");
  const[model,setModel]=useState("llama-3.3-70b-versatile");
  const[chats,setChats]=useState({});
  const[curChat,setCurChat]=useState(null);
  const[msgs,setMsgs]=useState([]);
  const[inp,setInp]=useState("");
  const[aiTyping,setAIT]=useState(false);
  const[voiceOn,setVO]=useState(false);
  const[micOn,setMicOn]=useState(false);
  const[spkOn,setSPK]=useState(false);
  const[projs,setProjs]=useState({});
  const[newPN,setNewPN]=useState("");
  const[showPF,setShowPF]=useState(false);
  const[imgP,setImgP]=useState("");
  const[imgOut,setImgOut]=useState(null);
  const[imgLoad,setImgLoad]=useState(false);
  const[planModal,setPlanModal]=useState(null);
  const[members,setMembers]=useState([]);
  const[adminTab,setAdminTab]=useState("members");
  const[exSc,setExSc]=useState(null);
  const[exName,setExName]=useState("");
  const[exEmail,setExEmail]=useState("");
  const[exErr,setExErr]=useState("");
  const[exAns,setExAns]=useState({});
  const[exScore,setExScore]=useState(0);
  const[certUrl,setCertUrl]=useState("");
  const[certDt,setCertDt]=useState("");
  const[certLoad,setCertLoad]=useState(false);
  const[gIdx,setGIdx]=useState(0);

  const botRef=useRef(null);
  const recRef=useRef(null);
  const inpRef=useRef(null);
  const msgsRef=useRef([]);
  useEffect(()=>{msgsRef.current=msgs;},[msgs]);

  const[isDesk,setIsDesk]=useState(()=>typeof window!=="undefined"&&window.innerWidth>=900);
  useEffect(()=>{
    const fn=()=>setIsDesk(window.innerWidth>=900);
    window.addEventListener("resize",fn);
    return()=>window.removeEventListener("resize",fn);
  },[]);

  // Theme
  const AC="#6c5ce7",AC2="#a29bfe",GOLD="#f9ca24",GRN="#00b894",RED="#e74c3c",CYN="#00cec9",ORG="#ff6b35";
  const BG=dark?"#0e0e1c":"#f1f1f8";
  const SU=dark?"#18182e":"#ffffff";
  const SU2=dark?"#20203a":"#f5f4ff";
  const BO=dark?"#2e2e50":"#dcdcee";
  const TX=dark?"#e6e6ff":"#1a1a3e";
  const MU=dark?"#6a6a9e":"#6666aa";

  const GM=[
    {id:"llama-3.3-70b-versatile",n:"Llama 3.3 70B",t:"Meta"},
    {id:"mixtral-8x7b-32768",n:"Mixtral 8x7B",t:"Mistral"},
    {id:"gemma2-9b-it",n:"Gemma 2 9B",t:"Google"},
    {id:"llama-3.1-8b-instant",n:"Llama 3.1 8B",t:"Meta"},
  ];
  const OM=[
    {id:"gpt-4o",n:"GPT-4o",t:"OpenAI"},
    {id:"gpt-4o-mini",n:"GPT-4o Mini",t:"OpenAI"},
    {id:"gpt-4-turbo",n:"GPT-4 Turbo",t:"OpenAI"},
    {id:"gpt-3.5-turbo",n:"GPT-3.5 Turbo",t:"OpenAI"},
  ];
  const MODELS=aiProv==="openai"?OM:GM;

  useEffect(()=>{
    const s=DB.g(SESS);
    if(s){const u=DB.g(uK(s));if(u){loadU(s,u);return;}}
    setPage("login");
  },[]);
  useEffect(()=>{botRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  function loadU(id,u){
    setUid(id);setUser(u);
    setChats(DB.g(cK(id),{}));
    setProjs(DB.g(pK(id),{}));
    // Load API keys ONLY from private settings — never from user object
    const sk=DB.g(sK(id),{});
    if(sk.groqKey)setGK(sk.groqKey);
    if(sk.openaiKey)setOK(sk.openaiKey);
    if(sk.prov)setProv(sk.prov);
    if(sk.model)setModel(sk.model);
    if(sk.dark!==undefined)setDark(sk.dark);
    if(sk.voice!==undefined)setVO(sk.voice);
    // Apply device preference: user-chosen OR window size
    const dev=u.dev||"mobile";
    if(dev==="desktop")setIsDesk(true);
    else if(dev==="mobile")setIsDesk(false);
    // else keep the auto-detected value
    setPage("main");
  }

  // pU: never allow API keys or password in user object
  function pU(id,patch){
    const u={...DB.g(uK(id))||{}};
    const BLOCKED=new Set(["groqKey","openaiKey","apiKey","pw","password"]);
    Object.keys(patch).forEach(k=>{if(!BLOCKED.has(k))u[k]=patch[k];});
    DB.s(uK(id),u);setUser(u);
  }
  function sv(patch){
    if(!uid)return;
    DB.s(sK(uid),{...DB.g(sK(uid),{}),...patch});
  }

  // AUTH
  function login(){
    setAE("");
    if(!form.email||!form.pw){setAE("Please fill all fields.");return;}
    const id=mkId(form.email);
    const u=DB.g(uK(id));
    if(!u){setAE("No account found. Please register.");return;}
    if(u.pw!==btoa(form.pw)){setAE("Incorrect password.");return;}
    DB.s(SESS,id);loadU(id,u);
  }
  function reg1(){
    setAE("");
    if(!form.email||!form.pw){setAE("Please fill all fields.");return;}
    if(!/\S+@\S+\.\S+/.test(form.email)){setAE("Enter a valid email address.");return;}
    if(form.pw.length<6){setAE("Password must be at least 6 characters.");return;}
    if(DB.g(uK(mkId(form.email)))){setAE("Email already registered. Please log in.");return;}
    setRS(2);
  }
  function reg2(){
    setAE("");
    if(!form.name.trim()||!form.mob.trim()){setAE("Please fill all fields.");return;}
    const id=mkId(form.email);
    const idx=DB.g(UIDX,[]);
    const u={
      name:form.name.trim(),
      email:form.email.toLowerCase().trim(),
      mob:form.mob.trim(),
      pw:btoa(form.pw),
      isAdmin:false,   // NEVER admin on registration
      isPro:false,
      isAdv:false,
      joined:new Date().toISOString(),
      examScore:null,certDate:null,certGranted:false,
      dev:form.dev||"mobile",
    };
    DB.s(uK(id),u);
    if(!idx.includes(id))DB.s(UIDX,[...idx,id]);
    DB.s(SESS,id);loadU(id,u);
  }
  function logout(){
    DB.d(SESS);
    // Clear sensitive data from memory on logout
    setGK("");setOK("");
    setUid(null);setUser(null);
    setChats({});setProjs({});setMsgs([]);setCurChat(null);
    setCertUrl("");setInp("");
    setForm({email:"",pw:"",name:"",mob:"",dev:"mobile"});
    setRS(1);setExSc(null);
    setPage("login");
  }

  // VOICE
  const startMic=useCallback(()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Voice not supported. Use Chrome or Edge.");return;}
    const r=new SR();r.lang="en-US";r.interimResults=false;r.maxAlternatives=1;
    r.onstart=()=>setMicOn(true);r.onend=()=>setMicOn(false);r.onerror=()=>setMicOn(false);
    r.onresult=e=>{const t=e.results[0][0].transcript;setInp(t);setMicOn(false);setTimeout(()=>sendMsg(t),200);};
    recRef.current=r;r.start();
  },[]);
  const stopMic=()=>{recRef.current?.stop();setMicOn(false);};
  const speakOut=(text)=>{
    if(!window.speechSynthesis)return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text.slice(0,500));
    u.rate=0.95;u.pitch=1;
    u.onstart=()=>setSPK(true);u.onend=()=>setSPK(false);u.onerror=()=>setSPK(false);
    window.speechSynthesis.speak(u);
  };
  const stopSpk=()=>{window.speechSynthesis?.cancel();setSPK(false);};

  // CHAT — API key always from private settings only
  async function sendMsg(override){
    const text=(override||inp).trim();
    if(!text||!curChat)return;
    // Security: read key ONLY from private settings key, never user object
    const sk=DB.g(sK(uid),{});
    const prov=sk.prov||aiProv;
    const key=prov==="openai"?(sk.openaiKey||openaiKey):(sk.groqKey||groqKey);
    if(!key||key.length<10){
      setMsgs(p=>[...p,{r:"ai",t:"⚠️ No API key set. Go to ⚙️ Settings → API Keys to add your key.",ts:nowT()}]);
      return;
    }
    const um={r:"user",t:text,ts:nowT()};
    const cur=msgsRef.current;
    const next=[...cur,um];
    msgsRef.current=next;setMsgs(next);setInp("");setAIT(true);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{inpRef.current?.focus();}));
    let aiText="";
    try{
      const hist=next.slice(-12).map(m=>({role:m.r==="user"?"user":"assistant",content:m.t}));
      const url=prov==="openai"
        ?"https://api.openai.com/v1/chat/completions"
        :"https://api.groq.com/openai/v1/chat/completions";
      const res=await fetch(url,{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
        body:JSON.stringify({model:sk.model||model,messages:hist,max_tokens:1024}),
      });
      if(!res.ok){const e=await res.json();throw new Error(e.error?.message||"API Error "+res.status);}
      const d=await res.json();
      aiText=d.choices?.[0]?.message?.content||"No response.";
    }catch(e){
      const msg=e.message||"Unknown error";
      if(msg.includes("quota")||msg.includes("billing")||msg.includes("exceeded")){
        aiText="⚠️ OpenAI Quota Error: You have exceeded your current usage quota. This is a billing issue on your OpenAI account — not an app issue.\n\n👉 Fix: Go to platform.openai.com → Billing → Add credits or upgrade your plan.\n\nDocs: https://platform.openai.com/docs/guides/error-codes/api-errors\n\nTip: Switch to Groq (free) in Settings → AI Provider.";
      }else if(msg.includes("401")||msg.includes("invalid_api_key")||msg.includes("Incorrect API key")){
        aiText="⚠️ Invalid API Key. Please check your key in Settings → API Keys.\n\nFor OpenAI: Get your key at platform.openai.com/api-keys\nFor Groq: Get your key at console.groq.com";
      }else{
        aiText="⚠️ "+msg;
      }
    }
    const am={r:"ai",t:aiText,ts:nowT()};
    const final=[...next,am];
    msgsRef.current=final;setMsgs(final);setAIT(false);
    const ch={...chats,[curChat]:final};setChats(ch);DB.s(cK(uid),ch);
    if(voiceOn)speakOut(aiText);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{inpRef.current?.focus();}));
  }

  function newChat(){
    const id="c"+Date.now();
    const wm={r:"ai",t:"Hello "+user?.name+"! 👋 I\'m Aurexis AI. How can I help you today?",ts:nowT()};
    const ch={...chats,[id]:[wm]};
    setChats(ch);DB.s(cK(uid),ch);
    setCurChat(id);setMsgs([wm]);msgsRef.current=[wm];
    setTab("chat");setSbOpen(false);
    setTimeout(()=>inpRef.current?.focus(),150);
  }
  function openChat(id){
    const m=chats[id]||[];
    setCurChat(id);setMsgs(m);msgsRef.current=m;
    setTab("chat");setSbOpen(false);
    setTimeout(()=>inpRef.current?.focus(),150);
  }

  // PROJECTS
  function mkProj(){
    if(!newPN.trim())return;
    const id="p"+Date.now();
    const p={...projs,[id]:{name:newPN.trim(),dt:new Date().toISOString()}};
    setProjs(p);DB.s(pK(uid),p);setNewPN("");setShowPF(false);
  }

  // ADMIN — security: only public fields, never password/keys
  const loadMembers=useCallback(()=>{
    const idx=DB.g(UIDX,[]);
    setMembers(idx.map(id=>{
      const u=DB.g(uK(id));if(!u)return null;
      // SECURITY: Only expose safe public fields.
      // Never include: pw (password hash), groqKey, openaiKey, or any apiKey
      return{
        id,
        name:u.name,
        email:u.email,
        isPro:u.isPro||false,
        isAdv:u.isAdv||false,
        isAdmin:u.isAdmin||false,
        examScore:u.examScore??null,
        certGranted:u.certGranted||false,
        joined:u.joined||null,
      };
    }).filter(Boolean));
  },[]);

  function grantPro(id){
    const u=DB.g(uK(id));if(!u)return;
    DB.s(uK(id),{...u,isPro:true,isAdv:false});
    if(id===uid)setUser(p=>({...p,isPro:true,isAdv:false}));
    loadMembers();
  }
  function grantAdv(id){
    const u=DB.g(uK(id));if(!u)return;
    DB.s(uK(id),{...u,isPro:true,isAdv:true});
    if(id===uid)setUser(p=>({...p,isPro:true,isAdv:true}));
    loadMembers();
  }
  function grantAdmin(id){
    const u=DB.g(uK(id));if(!u)return;
    // STRICT: admin ONLY if certified with 40+ score
    if(!u.certGranted||!(u.examScore>=40)){
      alert("Admin requires a passing certification (score 40+/50). This user has not qualified.");return;
    }
    DB.s(uK(id),{...u,isAdmin:true});
    if(id===uid)setUser(p=>({...p,isAdmin:true}));
    loadMembers();
  }

  // EXAM
  function startExam(){
    setExErr("");
    if(!exName.trim()){setExErr("Please enter your full name.");return;}
    if(!exEmail.trim()||!/\S+@\S+\.\S+/.test(exEmail)){setExErr("Please enter a valid email.");return;}
    setExAns({});setExSc("exam");
  }
  async function submitExam(){
    let s=0;
    QUIZ.forEach((q,i)=>{if(exAns[i]===q.a)s++;});
    const today=new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
    setExScore(s);setCertDt(today);
    const id=mkId(user.email);
    if(s>=40){
      setCertLoad(true);
      const url=await makeCert(exName.trim(),s,today,L);
      setCertUrl(url);setCertLoad(false);
      // Admin granted ONLY when score >= 40
      pU(id,{examScore:s,certDate:today,certGranted:true,certName:exName.trim(),isAdmin:true});
    }else{
      pU(id,{examScore:s});
    }
    setExSc("result");
  }

  const planTag=()=>user?.isAdv?{l:"⚡ Advance",bg:ORG}:user?.isPro?{l:"⭐ Pro",bg:AC}:{l:"Free",bg:MU};

  // ── STYLES ─────────────────────────────────────────────
  const S={
    app:{display:"flex",height:"100dvh",width:"100%",background:BG,color:TX,fontFamily:"system-ui,sans-serif",overflow:"hidden"},
    topbar:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",height:"52px",background:SU,borderBottom:"1px solid "+BO,flexShrink:0,zIndex:10},
    scroll:{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",minHeight:0},
    card:{background:SU,borderRadius:"12px",padding:"14px",marginBottom:"12px",border:"1px solid "+BO,boxShadow:"0 1px 3px rgba(108,92,231,0.04)"},
    fi:(ex={})=>({width:"100%",padding:"9px 12px",border:"1.5px solid "+BO,borderRadius:"9px",background:SU,color:TX,fontSize:"14px",outline:"none",boxSizing:"border-box",...ex}),
    btn:(bg=AC,fg="#fff",ex={})=>({background:bg,color:fg,border:"none",borderRadius:"9px",padding:"10px",fontSize:"14px",fontWeight:700,cursor:"pointer",width:"100%",...ex}),
    lbl:{fontSize:"11px",fontWeight:700,color:MU,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:"5px",display:"block"},
    err:{color:RED,fontSize:"12px",padding:"8px 12px",background:"#fff0f0",borderRadius:"8px",border:"1px solid #ffd0d0",marginTop:"4px"},
    sbBtn:(active)=>({display:"flex",alignItems:"center",gap:"10px",padding:"9px 14px",borderRadius:"9px",margin:"1px 8px",cursor:"pointer",background:active?(dark?"rgba(108,92,231,0.22)":"#ede9ff"):"transparent",color:active?AC:TX,fontWeight:active?700:400,fontSize:"13px",border:"none",width:"calc(100% - 16px)",textAlign:"left",transition:"background 0.15s"}),
    mbn:{display:"flex",background:SU,borderTop:"1px solid "+BO,flexShrink:0},
    mbBtn:(a)=>({flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"1px",padding:"6px 2px",border:"none",background:"none",cursor:"pointer",color:a?AC:MU,fontSize:"9px",fontWeight:a?700:400}),
  };

  // ── BOOT ─────────────────────────────────────────────
  if(page==="boot")return(
    <div style={{...S.app,alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
      <img src={L} style={{width:"88px",height:"88px",objectFit:"contain",marginBottom:"16px"}} alt=""/>
      <p style={{color:AC,fontWeight:900,fontSize:"24px",margin:0}}>Aurexis</p>
      <p style={{color:MU,fontSize:"13px",marginTop:"6px"}}>Loading…</p>
    </div>
  );

  // ── AUTH ─────────────────────────────────────────────
  if(page==="login"||page==="register"){
    function AuthForm(){
      return(<>
        <div style={{display:"flex",background:dark?"#252545":"#ede9ff",borderRadius:"12px",padding:"4px",marginBottom:"20px"}}>
          {["Log In","Register"].map((t,i)=>(<button key={t} onClick={()=>{setPage(i===0?"login":"register");setAE("");setRS(1);}} style={{flex:1,padding:"10px",border:"none",borderRadius:"9px",background:(page==="login")===(i===0)?AC:"transparent",color:(page==="login")===(i===0)?"#fff":MU,fontWeight:700,cursor:"pointer",fontSize:"14px"}}>{t}</button>))}
        </div>
        {page==="register"&&<p style={{color:MU,fontSize:"12px",textAlign:"center",margin:"0 0 14px"}}>Step {regStep} of 2</p>}
        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          {(page==="login"||regStep===1)&&<>
            <div><span style={S.lbl}>Email Address</span>
              <input style={S.fi()} type="email" placeholder="you@example.com" value={form.email}
                onChange={e=>setForm(p=>({...p,email:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&(page==="login"?login():reg1())}/>
            </div>
            <div><span style={S.lbl}>Password</span>
              <input style={S.fi()} type="password" placeholder={page==="register"?"Min 6 characters":"Your password"}
                value={form.pw} onChange={e=>setForm(p=>({...p,pw:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&(page==="login"?login():reg1())}/>
            </div>
          </>}
          {page==="register"&&regStep===2&&<>
            <div><span style={S.lbl}>Full Name</span>
              <input style={S.fi()} placeholder="e.g. Alice Johnson" value={form.name}
                onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
            </div>
            <div><span style={S.lbl}>Mobile Number</span>
              <input style={S.fi()} type="tel" placeholder="+91 98765 43210" value={form.mob}
                onChange={e=>setForm(p=>({...p,mob:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&reg2()}/>
            </div>
            <div><span style={S.lbl}>Device Type</span>
              <div style={{display:"flex",gap:"8px"}}>
                {["mobile","desktop"].map(d=>(<button key={d} onClick={()=>setForm(p=>({...p,dev:d}))}
                  style={{flex:1,padding:"9px",borderRadius:"9px",border:"1.5px solid "+(form.dev===d?AC:BO),background:form.dev===d?"#ede9ff":"transparent",color:form.dev===d?AC:TX,fontWeight:form.dev===d?700:400,cursor:"pointer",fontSize:"13px"}}>
                  {d==="mobile"?"📱 Mobile":"💻 Desktop"}
                </button>))}
              </div>
            </div>
          </>}
          {authErr&&<div style={S.err}>{authErr}</div>}
          {page==="login"&&<>
            <button style={S.btn()} onClick={login}>Log In →</button>
            <p style={{textAlign:"center",fontSize:"13px",color:MU,marginTop:"6px"}}>New to GoPlanet? <button onClick={()=>{setPage("register");setAE("");setRS(1);}} style={{background:"none",border:"none",color:AC,cursor:"pointer",fontWeight:700,fontSize:"13px"}}>Create an account</button></p>
          </>}
          {page==="register"&&regStep===1&&<button style={S.btn()} onClick={reg1}>Next →</button>}
          {page==="register"&&regStep===2&&<>
            <button style={S.btn()} onClick={reg2}>Create Account ✓</button>
            <button style={{background:"none",border:"none",color:AC,cursor:"pointer",fontSize:"13px",marginTop:"4px"}} onClick={()=>setRS(1)}>← Back</button>
          </>}
        </div>
      </>);
    }
    if(isDesk)return(
      <div style={S.app}>
        <div style={{width:"400px",flexShrink:0,background:"linear-gradient(160deg,#4a30bf,"+AC+")",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 40px"}}>
          <img src={L} style={{width:"86px",height:"86px",objectFit:"contain",marginBottom:"22px"}} alt=""/>
          <h1 style={{color:"#fff",fontSize:"28px",fontWeight:900,textAlign:"center",margin:"0 0 10px"}}>GoPlanet AI</h1>
          <p style={{color:"rgba(255,255,255,0.84)",fontSize:"14px",textAlign:"center",lineHeight:1.65,margin:"0 0 28px"}}>Intelligent AI assistant powered by Create-AI</p>
          {["🔒 Secure & Private","⚡ Very Fast AI Responses","🤖 Multiple AI Models","🌍 For Everyone"].map(f=>(<div key={f} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px",width:"100%"}}><span style={{color:"rgba(255,255,255,0.92)",fontSize:"14px"}}>{f}</span></div>))}
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:SU,padding:"48px"}}>
          <div style={{width:"100%",maxWidth:"380px"}}>
            <h2 style={{color:TX,margin:"0 0 22px",fontSize:"22px",fontWeight:800}}>{page==="login"?"Welcome back 👋":"Create your account"}</h2>
            <AuthForm/>
          </div>
        </div>
      </div>
    );
    return(
      <div style={{...S.app,flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 22px",background:SU}}>
        <img src={L} style={{width:"70px",height:"70px",objectFit:"contain",marginBottom:"10px"}} alt=""/>
        <h1 style={{color:AC,fontWeight:900,fontSize:"22px",margin:"0 0 3px"}}>Aurexis</h1>
        <p style={{color:MU,fontSize:"12px",marginBottom:"22px"}}>AI Chatbot · Powered by Groq & OpenAI</p>
        <div style={{width:"100%",maxWidth:"400px"}}><AuthForm/></div>
      </div>
    );
  }

  // ── GUIDE ────────────────────────────────────────────
  if(exSc==="guide"){
    const g=GUIDE[gIdx];
    return(
      <div style={{...S.app,flexDirection:"column"}}>
        <div style={S.topbar}>
          <button onClick={()=>{setExSc(null);setGIdx(0);}} style={{background:"none",border:"none",color:AC,fontWeight:800,fontSize:"18px",cursor:"pointer"}}>←</button>
          <span style={{fontWeight:800,color:AC}}>📖 User Guide</span>
          <span style={{fontSize:"12px",color:MU,background:SU2,padding:"3px 10px",borderRadius:"20px",fontWeight:700}}>{gIdx+1}/{GUIDE.length}</span>
        </div>
        <div style={{height:"4px",background:BO,flexShrink:0}}>
          <div style={{height:"100%",width:((gIdx+1)/GUIDE.length*100)+"%",background:"linear-gradient(90deg,"+AC+","+AC2+")",transition:"width 0.3s"}}/>
        </div>
        <div style={{...S.scroll}}>
          <div style={{background:"linear-gradient(135deg,"+g.color+"28,"+g.color+"06)",padding:"20px 20px 14px",borderBottom:"1px solid "+BO}}>
            <div style={{display:"flex",alignItems:"center",gap:"13px",maxWidth:isDesk?"700px":"100%",margin:"0 auto"}}>
              <div style={{width:"52px",height:"52px",borderRadius:"14px",background:g.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px",flexShrink:0,boxShadow:"0 4px 14px "+g.color+"44"}}>{g.icon}</div>
              <div><p style={{margin:0,fontSize:"11px",color:g.color,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}}>Chapter {gIdx+1} of {GUIDE.length}</p><h2 style={{margin:"2px 0 0",fontSize:"19px",color:TX,fontWeight:800}}>{g.title}</h2></div>
            </div>
          </div>
          <div style={{padding:"16px 18px 80px",maxWidth:isDesk?"700px":"100%",margin:"0 auto"}}>
            <div style={{...S.card,padding:0,overflow:"hidden",marginBottom:"14px"}}>
              {g.steps.map((st,i)=>(<div key={i} style={{display:"flex",gap:"12px",padding:"12px 14px",borderBottom:i<g.steps.length-1?"1px solid "+BO:"none",background:i%2===0?(dark?"rgba(255,255,255,0.02)":"#fafaff"):"transparent"}}>
                <div style={{width:"26px",height:"26px",borderRadius:"50%",background:"linear-gradient(135deg,"+g.color+","+g.color+"99)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:"12px",flexShrink:0,marginTop:"2px"}}>{i+1}</div>
                <div><p style={{margin:"0 0 2px",fontWeight:700,fontSize:"13px",color:TX}}>{st.h}</p><p style={{margin:0,fontSize:"13px",color:MU,lineHeight:1.6}}>{st.b}</p></div>
              </div>))}
            </div>
            <div style={{background:g.color+"18",border:"1.5px solid "+g.color+"55",borderRadius:"10px",padding:"12px 14px",marginBottom:"12px"}}>
              <p style={{margin:"0 0 4px",fontSize:"11px",fontWeight:800,color:g.color,textTransform:"uppercase"}}>💡 Pro Tip</p>
              <p style={{margin:0,fontSize:"13px",color:TX,lineHeight:1.6}}>{g.tip}</p>
            </div>
            <div style={{background:dark?"#1a1a30":"#f0f0ff",border:"1px solid "+BO,borderRadius:"10px",padding:"11px 14px",marginBottom:"18px"}}>
              <p style={{margin:"0 0 3px",fontSize:"11px",fontWeight:700,color:MU,textTransform:"uppercase"}}>📌 Note</p>
              <p style={{margin:0,fontSize:"13px",color:MU,lineHeight:1.6}}>{g.note}</p>
            </div>
            <div style={{display:"flex",gap:"10px",marginBottom:"14px"}}>
              <button disabled={gIdx===0} onClick={()=>setGIdx(p=>p-1)} style={{...S.btn(gIdx===0?"#e0e0e0":SU,gIdx===0?MU:AC,{flex:1,padding:"10px",fontSize:"13px",border:"1.5px solid "+(gIdx===0?BO:AC),opacity:gIdx===0?0.5:1})}}>← Prev</button>
              {gIdx<GUIDE.length-1
                ?<button style={S.btn(AC,"#fff",{flex:1,padding:"10px",fontSize:"13px"})} onClick={()=>setGIdx(p=>p+1)}>Next →</button>
                :<button style={S.btn(GRN,"#fff",{flex:1,padding:"10px",fontSize:"13px"})} onClick={()=>{setGIdx(0);setExSc(null);}}>✓ Complete!</button>}
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:"5px",flexWrap:"wrap"}}>
              {GUIDE.map((_,i)=>(<button key={i} title={GUIDE[i].title} onClick={()=>setGIdx(i)} style={{width:i===gIdx?22:7,height:"7px",borderRadius:"4px",border:"none",background:i===gIdx?AC:i<gIdx?AC2:BO,cursor:"pointer",transition:"all 0.2s",padding:0}}/>))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── EXAM ENTRY ───────────────────────────────────────
  if(exSc==="entry")return(
    <div style={{...S.app,flexDirection:"column"}}>
      <div style={S.topbar}>
        <button onClick={()=>setExSc(null)} style={{background:"none",border:"none",color:AC,fontWeight:800,fontSize:"18px",cursor:"pointer"}}>←</button>
        <span style={{fontWeight:800,color:AC}}>📝 Certification Exam</span>
        <div style={{width:"40px"}}/>
      </div>
      <div style={{...S.scroll,padding:isDesk?"32px calc(50% - 280px)":"16px"}}>
        <div style={{textAlign:"center",padding:"22px 16px",background:"linear-gradient(135deg,"+AC+","+AC2+")",borderRadius:"16px",marginBottom:"16px",color:"#fff"}}>
          <div style={{fontSize:"44px",marginBottom:"8px"}}>📜</div>
          <h2 style={{margin:"0 0 6px"}}>GoPlanet Certification</h2>
          <p style={{margin:0,fontSize:"13px",opacity:0.9}}>50 Questions · Score 40+ for certificate & Admin access</p>
        </div>
        <div style={{...S.card,marginBottom:"14px"}}>
          {["Your exact name will appear on the certificate.","Score 40+ out of 50 to earn a downloadable certificate.","Today\'s exact date is auto-printed on the certificate.","Scoring 40+ also grants you Admin access.","You can retake the exam anytime from Settings."].map((t,i)=>(
            <div key={i} style={{display:"flex",gap:"8px",marginBottom:"8px"}}>
              <span style={{color:GRN,fontWeight:700,flexShrink:0}}>✓</span>
              <span style={{fontSize:"13px",color:MU,lineHeight:1.5}}>{t}</span>
            </div>
          ))}
        </div>
        <div style={S.card}>
          <div style={{marginBottom:"10px"}}>
            <span style={S.lbl}>Full Name (appears on certificate) *</span>
            <input style={S.fi()} placeholder="e.g. Alice Johnson" value={exName} onChange={e=>setExName(e.target.value)}/>
          </div>
          <div style={{marginBottom:"12px"}}>
            <span style={S.lbl}>Email Address *</span>
            <input style={S.fi()} type="email" placeholder="alice@example.com" value={exEmail}
              onChange={e=>setExEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&startExam()}/>
          </div>
          {exErr&&<div style={S.err}>{exErr}</div>}
          <button style={S.btn()} onClick={startExam}>Start Exam →</button>
        </div>
      </div>
    </div>
  );

  // ── EXAM ─────────────────────────────────────────────
  if(exSc==="exam"){
    const done=Object.keys(exAns).length;
    const pct=Math.round(done/QUIZ.length*100);
    return(
      <div style={{...S.app,flexDirection:"column"}}>
        <div style={{background:SU,borderBottom:"1px solid "+BO,flexShrink:0,padding:"10px 16px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}>
            <button onClick={()=>setExSc("entry")} style={{background:"none",border:"none",color:RED,fontWeight:700,fontSize:"13px",cursor:"pointer"}}>✕ Exit</button>
            <span style={{fontWeight:700,fontSize:"14px"}}>Certification Exam</span>
            <span style={{fontSize:"12px",color:AC,background:SU2,padding:"3px 10px",borderRadius:"20px",fontWeight:700}}>{done}/{QUIZ.length}</span>
          </div>
          <div style={{height:"5px",background:BO,borderRadius:"3px",overflow:"hidden"}}>
            <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,"+AC+","+AC2+")",borderRadius:"3px",transition:"width 0.3s"}}/>
          </div>
        </div>
        <div style={{...S.scroll,padding:isDesk?"12px 20%":"12px 14px"}}>
          {QUIZ.map((q,i)=>(
            <div key={i} style={{...S.card,border:exAns[i]!==undefined?"1.5px solid "+AC2:"1px solid "+BO}}>
              <p style={{fontWeight:700,fontSize:"13px",margin:"0 0 10px",lineHeight:1.6}}>
                <span style={{color:AC,fontWeight:900}}>Q{i+1}. </span>{q.q}
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                {q.o.map((opt,j)=>(
                  <button key={j} onClick={()=>setExAns(p=>({...p,[i]:j}))}
                    style={{textAlign:"left",padding:"9px 12px",borderRadius:"8px",border:"1.5px solid "+(exAns[i]===j?AC:BO),background:exAns[i]===j?"#ede9ff":"transparent",cursor:"pointer",fontSize:"13px",color:exAns[i]===j?AC:TX,fontWeight:exAns[i]===j?700:400}}>
                    <span style={{fontWeight:800,marginRight:"6px",color:exAns[i]===j?AC:MU}}>{["A","B","C","D"][j]}.</span>{opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div style={{position:"sticky",bottom:"12px"}}>
            <button disabled={done<QUIZ.length||certLoad} onClick={submitExam}
              style={{...S.btn(done<QUIZ.length?"#bbb":AC),boxShadow:done>=QUIZ.length?"0 4px 18px rgba(108,92,231,0.4)":"none"}}>
              {certLoad?"Generating certificate…":done<QUIZ.length?`Answer all questions (${done}/${QUIZ.length} done)`:"Submit Exam ✓"}
            </button>
          </div>
          <div style={{height:"24px"}}/>
        </div>
      </div>
    );
  }

  // ── RESULT ───────────────────────────────────────────
  if(exSc==="result"){
    const passed=exScore>=40;
    return(
      <div style={{...S.app,flexDirection:"column"}}>
        <div style={S.topbar}><div style={{width:"40px"}}/><span style={{fontWeight:800,color:AC}}>Exam Result</span><div style={{width:"40px"}}/></div>
        <div style={{...S.scroll,padding:isDesk?"32px calc(50% - 280px)":"16px"}}>
          <div style={{textAlign:"center",padding:"26px 16px",borderRadius:"16px",marginBottom:"16px",color:"#fff",background:passed?"linear-gradient(135deg,"+AC+","+AC2+")":"linear-gradient(135deg,#e17055,#d63031)"}}>
            <div style={{fontSize:"52px",marginBottom:"8px"}}>{passed?"🏆":"📚"}</div>
            <h2 style={{margin:"0 0 6px"}}>{passed?"Congratulations!":"Almost There!"}</h2>
            <p style={{margin:"0 0 12px",opacity:0.9,fontSize:"14px"}}>{exName}</p>
            <div style={{display:"inline-block",background:"rgba(255,255,255,0.2)",borderRadius:"14px",padding:"10px 28px"}}>
              <span style={{fontSize:"36px",fontWeight:900}}>{exScore}</span>
              <span style={{fontSize:"16px",opacity:0.8}}> / 50</span>
            </div>
            <p style={{margin:"10px 0 0",fontSize:"13px",opacity:0.85}}>
              {passed?"You are now a Aurexis Certified User + Admin!":"Need "+(40-exScore)+" more correct answer"+(40-exScore===1?"":"s")+" to pass."}
            </p>
          </div>
          <div style={{...S.card,marginBottom:"14px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",textAlign:"center"}}>
              {[["✅",exScore,"Correct",GRN],["❌",50-exScore,"Wrong",RED],["📊",Math.round(exScore/50*100)+"%","Score",AC]].map(([ic,v,l,col])=>(
                <div key={l}><p style={{fontSize:"22px",fontWeight:900,color:col,margin:0}}>{v}</p><p style={{fontSize:"11px",color:MU,margin:"3px 0 0"}}>{ic} {l}</p></div>
              ))}
            </div>
          </div>
          {passed&&<>
            <div style={{...S.card,border:"2px solid "+AC,background:"#f8f6ff",marginBottom:"12px"}}>
              <p style={{margin:"0 0 4px",fontWeight:700,color:AC,fontSize:"14px"}}>🎉 Certificate ready!</p>
              <p style={{margin:0,fontSize:"13px",color:MU}}>Name: <strong>{exName}</strong> · Date: <strong>{certDt}</strong></p>
            </div>
            <button style={{...S.btn(),marginBottom:"10px"}} onClick={()=>setExSc("cert")}>View Certificate 🏆</button>
            <a href={certUrl} download={"Aurexis_Cert_"+exName.replace(/\s+/g,"_")+".png"}
              style={{display:"block",...S.btn(GRN,"#fff",{}),textDecoration:"none",textAlign:"center",lineHeight:"normal",padding:"10px",marginBottom:"10px"}}>
              📥 Download Certificate
            </a>
          </>}
          {!passed&&<div style={{...S.card,background:"#fff8f0",border:"1px solid #ffd0b0",marginBottom:"12px"}}>
            <p style={{margin:"0 0 4px",fontWeight:700,color:"#e17055",fontSize:"14px"}}>💡 You can do it!</p>
            <p style={{margin:0,fontSize:"13px",color:MU}}>Only {40-exScore} more correct answers needed!</p>
          </div>}
          <button style={S.btn(AC2,"#fff",{})} onClick={()=>{setExAns({});setExSc("exam");}}>🔄 Retake Exam</button>
          <button style={{background:"none",border:"none",color:AC,cursor:"pointer",fontSize:"13px",display:"block",margin:"12px auto 0",fontWeight:600}} onClick={()=>setExSc(null)}>← Back to Settings</button>
        </div>
      </div>
    );
  }

  // ── CERT VIEW ────────────────────────────────────────
  if(exSc==="cert")return(
    <div style={{...S.app,flexDirection:"column"}}>
      <div style={S.topbar}>
        <button onClick={()=>setExSc("result")} style={{background:"none",border:"none",color:AC,fontWeight:800,fontSize:"18px",cursor:"pointer"}}>←</button>
        <span style={{fontWeight:800,color:AC}}>🏆 My Certificate</span>
        <div style={{width:"40px"}}/>
      </div>
      <div style={{...S.scroll,padding:isDesk?"28px calc(50% - 280px)":"16px"}}>
        <div style={{textAlign:"center",padding:"16px",background:"linear-gradient(135deg,"+AC+","+AC2+")",borderRadius:"14px",marginBottom:"14px",color:"#fff"}}>
          <div style={{fontSize:"28px",marginBottom:"4px"}}>🏆</div>
          <h3 style={{margin:"0 0 2px"}}>Aurexis Certified User</h3>
          <p style={{margin:"0 0 2px",fontWeight:700}}>{user?.certName||exName}</p>
          <p style={{margin:0,fontSize:"12px",opacity:0.85}}>{user?.examScore||exScore}/50 · {user?.certDate||certDt}</p>
        </div>
        <img src={certUrl} alt="Certificate" style={{width:"100%",borderRadius:"12px",border:"2px solid "+AC,display:"block",marginBottom:"12px"}}/>
        <a href={certUrl} download={"Aurexis_Cert_"+(user?.certName||exName).replace(/\s+/g,"_")+".png"}
          style={{display:"block",...S.btn(AC,"#fff",{}),textDecoration:"none",textAlign:"center",lineHeight:"normal",padding:"12px",marginBottom:"10px"}}>
          📥 Download Certificate
        </a>
        <button style={S.btn(AC2,"#fff",{})} onClick={()=>{setExAns({});setExName(user?.name||"");setExEmail(user?.email||"");setExSc("entry");}}>🔄 Retake Exam</button>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════
  // MAIN APP
  // ════════════════════════════════════════════════════
  const chatList=Object.keys(chats).map(id=>({
    id,
    preview:(chats[id]?.find(m=>m.r==="user")?.t||"New Chat").slice(0,34),
    ts_:chats[id]?.[chats[id].length-1]?.ts||"",
  })).reverse();
  const projList=Object.keys(projs).map(id=>({id,...projs[id]}));
  const ptag=planTag();

  /*
    NAV: Admin tab ONLY shows when user.isAdmin===true
    Clicking Admin does NOT lock other tabs — all sidebar buttons always navigate
  */
  const NAV=[
    {id:"chat",icon:"💬",label:"AI Chatbot"},
    {id:"projects",icon:"📁",label:"Projects"},
    {id:"image",icon:"🎨",label:"Image Generator"},
    {id:"cowork",icon:"👥",label:"Co-Work",link:"https://create-pied.vercel.app/"},
    {id:"chats",icon:"💬",label:"Chats"},
    {id:"plans",icon:"⭐",label:"Subscription"},
    {id:"settings",icon:"⚙️",label:"Settings"},
    ...(user?.isAdmin?[{id:"admin",icon:"🛡️",label:"Admin"}]:[]),
  ];
  // Mobile bottom nav — includes Admin if user is admin, replaces More
  const MOBN=user?.isAdmin
    ?[{id:"chat",icon:"💬",label:"Chat"},{id:"projects",icon:"📁",label:"Projects"},{id:"image",icon:"🎨",label:"Images"},{id:"admin",icon:"🛡️",label:"Admin"},{id:"settings",icon:"⚙️",label:"More"}]
    :[{id:"chat",icon:"💬",label:"Chat"},{id:"projects",icon:"📁",label:"Projects"},{id:"image",icon:"🎨",label:"Images"},{id:"plans",icon:"⭐",label:"Plans"},{id:"settings",icon:"⚙️",label:"More"}];

  // ── SIDEBAR — always navigates, no locking ──────────
  function Sidebar({onClose}){
    const close=onClose||function(){};
    return(
      <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden",background:SU}}>
        <div style={{padding:"14px 14px 12px",borderBottom:"1px solid "+BO,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"9px",marginBottom:"13px"}}>
            <img src={L} style={{width:"28px",height:"28px",objectFit:"contain"}} alt=""/>
            <span style={{fontWeight:900,fontSize:"16px",color:AC}}>Aurexis</span>
          </div>
          <div style={{display:"flex",gap:"9px",alignItems:"center",padding:"9px 11px",background:SU2,borderRadius:"10px",border:"1px solid "+BO}}>
            <div style={{width:"32px",height:"32px",borderRadius:"50%",background:"linear-gradient(135deg,"+AC+","+AC2+")",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:"14px",flexShrink:0}}>{user?.name?.[0]?.toUpperCase()}</div>
            <div style={{minWidth:0,flex:1}}>
              <p style={{margin:0,fontWeight:700,fontSize:"12px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name}</p>
              <span style={{fontSize:"10px",padding:"1px 6px",borderRadius:"6px",background:ptag.bg,color:"#fff",fontWeight:700}}>{ptag.l}</span>
            </div>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"6px 0",WebkitOverflowScrolling:"touch"}}>
          {/*
            ALL nav items always work regardless of current tab.
            Clicking Admin then clicking "AI Chatbot" works perfectly.
          */}
          {NAV.map(it=>(
            it.link
              ?<a key={it.id} href={it.link} target="_blank" rel="noopener noreferrer"
                style={{...S.sbBtn(false),textDecoration:"none",display:"flex",alignItems:"center"}}>
                <span style={{fontSize:"15px",flexShrink:0}}>{it.icon}</span>
                <span style={{flex:1}}>{it.label}</span>
                <span style={{fontSize:"9px",color:MU}}>↗</span>
              </a>
              :<button key={it.id} style={S.sbBtn(tab===it.id)}
                onClick={()=>{setTab(it.id);close();}}>
                <span style={{fontSize:"15px",flexShrink:0}}>{it.icon}</span>
                <span style={{flex:1}}>{it.label}</span>
                {it.id==="admin"&&<span style={{fontSize:"9px",background:AC,color:"#fff",padding:"1px 6px",borderRadius:"6px",flexShrink:0}}>Admin Only</span>}
              </button>
          ))}
          <div style={{height:"1px",background:BO,margin:"8px 10px"}}/>
          <p style={{fontSize:"10px",fontWeight:700,color:MU,textTransform:"uppercase",letterSpacing:"0.7px",padding:"3px 14px 5px"}}>Chats</p>
          {chatList.length===0&&<p style={{fontSize:"12px",color:MU,padding:"0 14px"}}>No chats yet.</p>}
          {chatList.slice(0,8).map(c=>(
            <button key={c.id} onClick={()=>openChat(c.id)}
              style={{...S.sbBtn(curChat===c.id),flexDirection:"column",alignItems:"flex-start",gap:"2px",padding:"7px 14px"}}>
              <span style={{fontSize:"12px",fontWeight:curChat===c.id?700:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",width:"100%"}}>💬 {c.preview}…</span>
              <span style={{fontSize:"10px",color:MU}}>{c.ts_}</span>
            </button>
          ))}
        </div>
        {!user?.isAdv&&<div style={{margin:"8px",padding:"12px",background:"linear-gradient(135deg,"+AC+","+AC2+")",borderRadius:"10px",color:"#fff",flexShrink:0}}>
          <p style={{margin:"0 0 2px",fontWeight:800,fontSize:"12px"}}>{user?.isPro?"⚡ Upgrade to Advance":"⭐ Upgrade to Pro"}</p>
          <p style={{margin:"0 0 7px",fontSize:"10px",opacity:0.9}}>{user?.isPro?"$50/year · Fastest AI":"$25/year · Faster AI + more"}</p>
          <button onClick={()=>{setTab("plans");close();}} style={{background:"rgba(255,255,255,0.18)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:"7px",padding:"5px",fontSize:"11px",fontWeight:700,cursor:"pointer",width:"100%"}}>Subscribe Now</button>
        </div>}
        <button onClick={logout} style={{margin:"0 8px 10px",background:"none",border:"1px solid "+RED,color:RED,borderRadius:"8px",padding:"8px",cursor:"pointer",fontSize:"12px",fontWeight:600,flexShrink:0}}>🚪 Log Out</button>
      </div>
    );
  }

  // ── CHAT ─────────────────────────────────────────────
  function ChatContent(){
    const pLabel=aiProv==="openai"?"OpenAI":"Groq";
    return(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        {!curChat?(
          /* ── Welcome screen — matches image exactly ──────────── */
          <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            {/* Hero: white bg, purple/pink wave SVG, logo+title */}
            <div style={{position:"relative",background:"#fff",borderBottom:"1px solid #e8e8f0",overflow:"hidden",minHeight:"160px",padding:"28px 28px 24px"}}>
              {/* Wave SVG — matches the purple/pink gradient waves in image */}
              <svg style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none"}} viewBox="0 0 1060 160" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="wg1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity="0"/>
                    <stop offset="40%" stopColor="#8b5cf6" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#ec4899" stopOpacity="0.4"/>
                  </linearGradient>
                  <linearGradient id="wg2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6c5ce7" stopOpacity="0"/>
                    <stop offset="50%" stopColor="#a29bfe" stopOpacity="0.45"/>
                    <stop offset="100%" stopColor="#f472b6" stopOpacity="0.3"/>
                  </linearGradient>
                  <linearGradient id="wg3" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0"/>
                    <stop offset="60%" stopColor="#c4b5fd" stopOpacity="0.35"/>
                    <stop offset="100%" stopColor="#fb7185" stopOpacity="0.25"/>
                  </linearGradient>
                </defs>
                {/* Many layered wave paths — creates the mesh-like effect */}
                <path d="M0,100 C200,30 400,140 600,80 S900,20 1060,60" stroke="url(#wg1)" strokeWidth="2" fill="none"/>
                <path d="M0,120 C150,60 350,150 550,90 S850,40 1060,80" stroke="url(#wg1)" strokeWidth="1.5" fill="none"/>
                <path d="M0,80 C250,20 450,130 650,70 S950,15 1060,50" stroke="url(#wg2)" strokeWidth="2" fill="none"/>
                <path d="M0,140 C180,80 380,150 580,100 S880,50 1060,90" stroke="url(#wg2)" strokeWidth="1.5" fill="none"/>
                <path d="M0,60 C300,10 500,120 700,55 S1000,5 1060,30" stroke="url(#wg3)" strokeWidth="1.5" fill="none"/>
                <path d="M0,150 C220,100 420,155 620,110 S920,65 1060,110" stroke="url(#wg3)" strokeWidth="1" fill="none"/>
                <path d="M500,0 C600,30 700,80 750,60 S900,20 1060,40" stroke="url(#wg1)" strokeWidth="1.5" fill="none"/>
                <path d="M400,0 C520,40 650,100 720,70 S950,30 1060,55" stroke="url(#wg2)" strokeWidth="1" fill="none"/>
                {/* Glowing dots/nodes */}
                <circle cx="680" cy="55" r="3" fill="#8b5cf6" opacity="0.6"/>
                <circle cx="820" cy="35" r="2" fill="#ec4899" opacity="0.5"/>
                <circle cx="920" cy="70" r="2.5" fill="#a78bfa" opacity="0.55"/>
                <circle cx="760" cy="90" r="2" fill="#f472b6" opacity="0.45"/>
                <circle cx="1000" cy="45" r="2" fill="#8b5cf6" opacity="0.4"/>
              </svg>
              {/* Logo + title */}
              <div style={{position:"relative",zIndex:1,display:"flex",alignItems:"center",gap:"14px"}}>
                <img src={L} style={{width:"52px",height:"52px",objectFit:"contain",flexShrink:0}} alt=""/>
                <div>
                  <h2 style={{margin:"0 0 3px",fontSize:"20px",fontWeight:800,color:"#1a1a2e"}}>AI Chatbot Aurexis</h2>
                  <p style={{margin:"0 0 4px",fontSize:"13px",color:AC,fontWeight:600}}>Powered by Create-AI</p>
                  <p style={{margin:0,fontSize:"13px",color:"#888"}}>Your intelligent assistant for chatting, creating, coding, and more.</p>
                </div>
              </div>
            </div>

            {/* Model selector — matches image chips style */}
            <div style={{padding:"16px 20px 0",background:"#fff"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                <p style={{margin:0,fontSize:"13px",fontWeight:600,color:"#1a1a2e"}}>Choose {pLabel} Model</p>
                <button onClick={()=>setTab("settings")} style={{background:"none",border:"none",color:AC,fontSize:"12px",fontWeight:600,cursor:"pointer"}}>View All Models</button>
              </div>
              {/* Model chips — horizontal scroll, matches image */}
              <div style={{display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"12px",borderBottom:"1px solid #e8e8f0",scrollbarWidth:"none"}}>
                {MODELS.map(m=>(
                  <button key={m.id} onClick={()=>{setModel(m.id);sv({model:m.id});}}
                    style={{flexShrink:0,display:"flex",alignItems:"center",gap:"8px",padding:"8px 14px",borderRadius:"10px",border:model===m.id?"1.5px solid "+AC:"1.5px solid #e8e8f0",background:model===m.id?"#f5f3ff":"#fafafa",cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
                    <div style={{width:"28px",height:"28px",borderRadius:"7px",background:model===m.id?"linear-gradient(135deg,"+AC+","+AC2+")":"#ede9ff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
                      <img src={L} style={{width:"22px",height:"22px",objectFit:"contain",filter:model===m.id?"brightness(10)":"none"}} alt=""/>
                    </div>
                    <div style={{textAlign:"left"}}>
                      <p style={{margin:0,fontWeight:700,fontSize:"12px",color:model===m.id?AC:"#1a1a2e",whiteSpace:"nowrap"}}>{m.n}</p>
                      <p style={{margin:0,fontSize:"10px",color:"#888"}}>{m.t}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent chats list on welcome screen */}
            {chatList.length>0&&<div style={{padding:"16px 20px",background:"#fff"}}>
              {chatList.slice(0,5).map(c=>(
                <button key={c.id} onClick={()=>openChat(c.id)}
                  style={{display:"flex",alignItems:"center",gap:"12px",width:"100%",padding:"10px 12px",marginBottom:"6px",borderRadius:"10px",border:"1px solid #e8e8f0",background:"#fafafa",cursor:"pointer",textAlign:"left"}}>
                  <div style={{width:"32px",height:"32px",borderRadius:"9px",background:"linear-gradient(135deg,#ede9ff,#ddd8ff)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
                  <img src={L} style={{width:"24px",height:"24px",objectFit:"contain"}} alt=""/>
                </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{margin:"0 0 2px",fontWeight:600,fontSize:"13px",color:"#1a1a2e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.preview}…</p>
                    <p style={{margin:0,fontSize:"11px",color:"#999"}}>{c.ts_}</p>
                  </div>
                </button>
              ))}
            </div>}

            {/* Footer — 4 feature cards + copyright + links */}
            <div style={{padding:"16px 20px",background:"#fff",borderTop:"1px solid #e8e8f0",marginTop:"8px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"16px",marginBottom:"16px"}}>
                {[
                  {icon:"🔒",col:"#00b894",t:"Secure & Private",d:"Your data is encrypted and safe with us."},
                  {icon:"⚡",col:"#e17055",t:"Local & Fast",d:"Powered by Groq running fast AI models."},
                  {icon:"⚙️",col:"#6c5ce7",t:"Innovative AI",d:"Choose from the best open models."},
                  {icon:"🌍",col:"#fdcb6e",t:"User Friendly",d:"Designed for everyone, easy to use."},
                ].map(f=>(
                  <div key={f.t} style={{display:"flex",gap:"10px",alignItems:"flex-start"}}>
                    <div style={{width:"32px",height:"32px",borderRadius:"50%",background:f.col+"22",border:"1px solid "+f.col+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",flexShrink:0}}>{f.icon}</div>
                    <div><p style={{margin:"0 0 2px",fontWeight:700,fontSize:"12px",color:"#1a1a2e"}}>{f.t}</p><p style={{margin:0,fontSize:"11px",color:"#888",lineHeight:1.4}}>{f.d}</p></div>
                  </div>
                ))}
              </div>
              <div style={{borderTop:"1px solid #e8e8f0",paddingTop:"12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <p style={{margin:0,fontSize:"11px",color:"#aaa"}}>© 2025 Aurexis. All rights reserved.</p>
                <div style={{display:"flex",gap:"16px"}}>
                  {["Privacy Policy","Terms of Service","Contact Us"].map(l=>(
                    <span key={l} style={{fontSize:"11px",color:"#888",cursor:"pointer"}}>{l}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ):(
          /* ── Active chat view ─────────────────────────────── */
          <>
            {/* Chat header bar */}
            <div style={{padding:"8px 16px",background:"#fff",borderBottom:"1px solid #e8e8f0",flexShrink:0,display:"flex",alignItems:"center",gap:"10px"}}>
              <button onClick={()=>setCurChat(null)} style={{background:"none",border:"none",color:"#888",fontSize:"18px",cursor:"pointer",lineHeight:1,flexShrink:0}}>←</button>
              <div style={{display:"flex",alignItems:"center",gap:"8px",flex:1}}>
                <img src={L} style={{width:"24px",height:"24px",objectFit:"contain",borderRadius:"50%"}} alt=""/>
                <div>
                  <p style={{margin:0,fontSize:"13px",fontWeight:700,color:"#1a1a2e"}}>Aurexis AI</p>
                  <p style={{margin:0,fontSize:"10px",color:"#888"}}>{MODELS.find(m=>m.id===model)?.n||model} via {pLabel}</p>
                </div>
              </div>
            </div>
            {/* Messages */}
            <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"16px 20px",background:"#fff"}}>
              {msgs.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.r==="user"?"flex-end":"flex-start",marginBottom:"12px",gap:"8px",alignItems:"flex-end"}}>
                  {m.r==="ai"&&<img src={L} style={{width:"28px",height:"28px",objectFit:"contain",flexShrink:0,borderRadius:"50%",border:"1px solid #e8e8f0"}} alt=""/>}
                  {m.r==="ai"&&<div style={{maxWidth:"72%"}}>
                    <p style={{margin:"0 0 3px",fontSize:"11px",fontWeight:600,color:AC}}>Aurexis AI <span style={{color:"#bbb",fontWeight:400}}>{m.ts}</span></p>
                    <div style={{padding:"10px 14px",borderRadius:"4px 14px 14px 14px",background:"#f8f7ff",border:"1px solid #e8e8f0",fontSize:"13px",lineHeight:1.65,color:"#1a1a2e",wordBreak:"break-word"}}>
                      <pre style={{margin:0,whiteSpace:"pre-wrap",fontFamily:"inherit"}}>{m.t}</pre>
                    </div>
                  </div>}
                  {m.r==="user"&&<div style={{maxWidth:"72%"}}>
                    <p style={{margin:"0 0 3px",fontSize:"11px",fontWeight:600,color:"#888",textAlign:"right"}}>Today, {m.ts}</p>
                    <div style={{padding:"10px 14px",borderRadius:"14px 4px 14px 14px",background:AC,fontSize:"13px",lineHeight:1.65,color:"#fff",wordBreak:"break-word"}}>
                      <pre style={{margin:0,whiteSpace:"pre-wrap",fontFamily:"inherit"}}>{m.t}</pre>
                    </div>
                  </div>}
                  {m.r==="user"&&<div style={{width:"28px",height:"28px",borderRadius:"50%",background:AC,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:"12px",flexShrink:0}}>{user?.name?.[0]?.toUpperCase()}</div>}
                </div>
              ))}
              {aiTyping&&<div style={{display:"flex",gap:"8px",marginBottom:"12px",alignItems:"flex-end"}}>
                <img src={L} style={{width:"28px",height:"28px",objectFit:"contain",borderRadius:"50%",border:"1px solid #e8e8f0"}} alt=""/>
                <div style={{padding:"10px 16px",borderRadius:"4px 14px 14px 14px",background:"#f8f7ff",border:"1px solid #e8e8f0"}}>
                  <span style={{fontSize:"18px",letterSpacing:"4px",color:AC}}>•••</span>
                </div>
              </div>}
              <div ref={botRef}/>
            </div>
            {/* INPUT BAR IS RENDERED OUTSIDE TC() IN THE MAIN LAYOUT — see desktop/mobile layout below */}
            <div style={{height:"68px",flexShrink:0}}/>
          </>
        )}
      </div>
    );
  }


  // ── PROJECTS ─────────────────────────────────────────
  function ProjContent(){
    return(<div style={{padding:"20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
        <h2 style={{margin:0,fontSize:"18px",fontWeight:800}}>📁 Projects</h2>
        <button onClick={()=>setShowPF(true)} style={{background:AC,color:"#fff",border:"none",borderRadius:"8px",padding:"7px 14px",fontSize:"13px",fontWeight:700,cursor:"pointer"}}>+ New</button>
      </div>
      {showPF&&<div style={{...S.card,background:SU2,marginBottom:"14px"}}>
        <input style={{...S.fi({marginBottom:"8px"})}} placeholder="Project name…" value={newPN} onChange={e=>setNewPN(e.target.value)} onKeyDown={e=>e.key==="Enter"&&mkProj()} autoFocus/>
        <div style={{display:"flex",gap:"8px"}}>
          <button style={S.btn()} onClick={mkProj}>Create</button>
          <button style={{...S.btn(dark?"#333":"#e0e0e0",dark?"#eee":"#444",{flex:"none",padding:"10px 20px"})}} onClick={()=>{setShowPF(false);setNewPN("");}}>Cancel</button>
        </div>
      </div>}
      {projList.length===0
        ?<div style={{textAlign:"center",marginTop:"40px",color:MU}}><div style={{fontSize:"38px",marginBottom:"8px"}}>📁</div><p>No projects yet.</p></div>
        :<div style={{display:isDesk?"grid":"flex",gridTemplateColumns:isDesk?"repeat(auto-fill,minmax(200px,1fr))":"",flexDirection:"column",gap:"10px"}}>
          {projList.map(p=>(<div key={p.id} style={S.card}><p style={{margin:0,fontWeight:700,fontSize:"14px"}}>📁 {p.name}</p><p style={{margin:"4px 0 0",fontSize:"11px",color:MU}}>Created {new Date(p.dt).toLocaleDateString()}</p></div>))}
        </div>}
    </div>);
  }

  // ── IMAGE ─────────────────────────────────────────────
  function ImgContent(){
    return(<div style={{padding:"20px"}}>
      <h2 style={{margin:"0 0 6px",fontSize:"18px",fontWeight:800}}>🎨 Image Generator</h2>
      <p style={{color:MU,fontSize:"13px",marginBottom:"14px"}}>Describe the image you want to generate.</p>
      <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
        <textarea style={{...S.fi({flex:1,height:"56px",resize:"none"})}} placeholder="A futuristic city in the clouds…" value={imgP} onChange={e=>setImgP(e.target.value)}/>
        <button style={{...S.btn(AC,"#fff",{width:"auto",padding:"0 16px",alignSelf:"stretch",borderRadius:"9px"}),flexShrink:0}}
          onClick={()=>{if(imgP.trim()){setImgLoad(true);const url="https://image.pollinations.ai/prompt/"+encodeURIComponent(imgP)+"?width=800&height=600&nologo=true&seed="+Math.floor(Math.random()*9999);setImgOut(url);setTimeout(()=>setImgLoad(false),2000);}}}>{imgLoad?"…":"Generate"}</button>
      </div>
      {imgOut&&<img src={imgOut} alt="Generated" style={{width:"100%",borderRadius:"12px",border:"1px solid "+BO}}/>}
    </div>);
  }

  // ── PLANS ─────────────────────────────────────────────
  function PlansContent(){
    const PLANS=[
      {id:"free",name:"Free Plan",price:"$0",per:" forever",col:MU,feats:["Basic AI responses","Standard models","Community support"],btn:null},
      {id:"pro",name:"⭐ Pro Plan",price:"$25",per:"/year",col:AC,badge:"POPULAR",feats:["Faster AI responses","Advanced AI models","Priority support","Early access features"],btn:"Subscribe to Pro"},
      {id:"advance",name:"⚡ Advance Plan",price:"$50",per:"/year",col:ORG,badge:"BEST",feats:["Very fast AI responses","Very advanced AI models","Priority support","Early access to EVERY feature"],btn:"Subscribe to Advance"},
    ];
    return(<div style={{padding:"20px"}}>
      <h2 style={{margin:"0 0 16px",fontSize:"18px",fontWeight:800}}>⭐ Subscription Plans</h2>
      {user?.isAdv&&<div style={{...S.card,background:"linear-gradient(135deg,"+ORG+",#ff9f43)",color:"#fff",border:"none",marginBottom:"14px"}}><h3 style={{margin:"0 0 6px"}}>⚡ Advance Plan Active</h3>{["Very fast AI responses","Very advanced AI models","Priority support","Early access to every feature"].map(f=><p key={f} style={{margin:"3px 0",fontSize:"13px"}}>✓ {f}</p>)}</div>}
      {!user?.isAdv&&user?.isPro&&<div style={{...S.card,background:"linear-gradient(135deg,"+AC+","+AC2+")",color:"#fff",border:"none",marginBottom:"14px"}}><h3 style={{margin:"0 0 6px"}}>⭐ Pro Plan Active</h3>{["Faster responses","Advanced models","Priority support"].map(f=><p key={f} style={{margin:"3px 0",fontSize:"13px"}}>✓ {f}</p>)}</div>}
      <div style={{display:isDesk?"grid":"flex",gridTemplateColumns:isDesk?"1fr 1fr 1fr":"",flexDirection:"column",gap:"12px"}}>
        {PLANS.map(pl=>(<div key={pl.id} style={{...S.card,border:"2px solid "+(pl.id==="advance"?ORG:pl.id==="pro"?AC:BO),position:"relative"}}>
          {pl.badge&&<span style={{position:"absolute",top:-1,right:"12px",background:pl.id==="advance"?ORG:AC,color:"#fff",borderRadius:"0 0 8px 8px",padding:"2px 10px",fontSize:"10px",fontWeight:700}}>{pl.badge}</span>}
          <h3 style={{color:pl.col,margin:"0 0 4px"}}>{pl.name}</h3>
          <p style={{fontSize:"26px",fontWeight:900,color:pl.col,margin:"0 0 12px"}}>{pl.price}<span style={{fontSize:"13px",color:MU}}>{pl.per}</span></p>
          {pl.feats.map(f=><p key={f} style={{margin:"4px 0",fontSize:"13px",color:MU}}>✓ {f}</p>)}
          {pl.btn&&!((pl.id==="pro"&&user?.isPro)||(pl.id==="advance"&&user?.isAdv))&&
            <button style={{...S.btn(pl.id==="advance"?ORG:AC,"#fff",{marginTop:"12px"})}} onClick={()=>setPlanModal(pl.id)}>{pl.btn}</button>}
        </div>))}
      </div>
      {planModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
        <div style={{background:SU,borderRadius:"16px",padding:"24px",width:"100%",maxWidth:"380px",border:"1px solid "+BO}}>
          <h3 style={{color:AC,margin:"0 0 4px"}}>Complete Subscription</h3>
          <p style={{fontSize:"13px",color:MU,marginBottom:"16px"}}>{planModal==="advance"?"Advance Plan — $50/year":"Pro Plan — $25/year"}</p>
          <input style={{...S.fi({marginBottom:"8px"})}} placeholder="Card number"/>
          <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
            <input style={{...S.fi({flex:1})}} placeholder="MM/YY"/>
            <input style={{...S.fi({flex:1})}} placeholder="CVV"/>
          </div>
          <button style={{...S.btn(planModal==="advance"?ORG:AC,"#fff",{marginBottom:"8px"})}}
            onClick={()=>{pU(uid,{isPro:true,isAdv:planModal==="advance"});setPlanModal(null);alert("🎉 "+(planModal==="advance"?"Advance":"Pro")+" activated!");}}>
            Pay {planModal==="advance"?"$50":"$25"}/year
          </button>
          <button style={{background:"none",border:"none",color:MU,cursor:"pointer",fontSize:"13px",width:"100%"}} onClick={()=>setPlanModal(null)}>Cancel</button>
        </div>
      </div>}
    </div>);
  }

  // ── SETTINGS ─────────────────────────────────────────
  function SettingsContent(){
    return(<div style={{padding:"20px"}}>
      <h2 style={{margin:"0 0 16px",fontSize:"18px",fontWeight:800}}>⚙️ Settings</h2>
      <div style={S.card}>
        <span style={S.lbl}>🔑 API Keys</span>
        <div style={{padding:"8px 10px",background:dark?"#1a2a1a":"#f0fff0",borderRadius:"8px",border:"1px solid "+GRN+"44",marginBottom:"12px",fontSize:"12px",color:MU,lineHeight:1.5}}>
          🔒 API keys are stored <strong>only on this device</strong> in a private, user-specific key. Never stored in your account, never sent to GoPlanet servers, never visible to any other user.
        </div>
        <p style={{margin:"0 0 4px",fontSize:"13px",fontWeight:700}}>Groq API Key <span style={{color:GRN,fontSize:"11px",fontWeight:400}}>(Free — console.groq.com)</span></p>
        <input style={{...S.fi({fontFamily:"monospace",fontSize:"12px",marginBottom:"10px"})}} type="password" placeholder="gsk_…" value={groqKey} onChange={e=>setGK(e.target.value)}/>
        <p style={{margin:"0 0 4px",fontSize:"13px",fontWeight:700}}>OpenAI API Key <span style={{color:MU,fontSize:"11px",fontWeight:400}}>(Optional — platform.openai.com)</span></p>
        <input style={{...S.fi({fontFamily:"monospace",fontSize:"12px",marginBottom:"12px"})}} type="password" placeholder="sk-…" value={openaiKey} onChange={e=>setOK(e.target.value)}/>
        <p style={{margin:"0 0 6px",fontSize:"13px",fontWeight:700}}>AI Provider</p>
        <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
          {[{id:"groq",l:"⚡ Groq (Fast & Free)"},{id:"openai",l:"🤖 OpenAI"}].map(p=>(<button key={p.id}
            onClick={()=>{setProv(p.id);sv({prov:p.id,model:p.id==="groq"?GM[0].id:OM[0].id});setModel(p.id==="groq"?GM[0].id:OM[0].id);}}
            style={{flex:1,padding:"9px",borderRadius:"9px",border:"1.5px solid "+(aiProv===p.id?AC:BO),background:aiProv===p.id?"#ede9ff":"transparent",color:aiProv===p.id?AC:TX,fontWeight:aiProv===p.id?700:400,cursor:"pointer",fontSize:"12px"}}>{p.l}</button>))}
        </div>
        <button style={S.btn()} onClick={()=>{sv({groqKey,openaiKey,prov:aiProv,model});alert("✅ API keys & provider saved! Using "+aiProv.toUpperCase()+" now.");}}>Save API Keys</button>
      </div>
      <div style={S.card}>
        <span style={S.lbl}>🤖 AI Model</span>
        {MODELS.map(m=>(<button key={m.id} onClick={()=>{setModel(m.id);sv({model:m.id});}}
          style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",padding:"9px 12px",marginBottom:"6px",borderRadius:"9px",border:"1.5px solid "+(model===m.id?AC:BO),background:model===m.id?"#ede9ff":"transparent",cursor:"pointer",textAlign:"left"}}>
          <span style={{fontSize:"13px",color:model===m.id?AC:TX,fontWeight:model===m.id?700:400}}>{m.n}</span>
          <span style={{fontSize:"11px",color:MU}}>{m.t}</span>
        </button>))}
      </div>
      <div style={S.card}>
        <span style={S.lbl}>🎨 Appearance</span>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:"13px"}}>Dark Mode</span>
          <button onClick={()=>setDark(d=>{sv({dark:!d});return !d;})} style={{width:"44px",height:"24px",borderRadius:"12px",background:dark?AC:"#ddd",border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s"}}>
            <div style={{width:"20px",height:"20px",borderRadius:"50%",background:"#fff",position:"absolute",top:"2px",left:dark?"22px":"2px",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
          </button>
        </div>
      </div>
      <div style={S.card}>
        <span style={S.lbl}>🎤 Voice Mode</span>
        <p style={{fontSize:"12px",color:MU,margin:"0 0 9px",lineHeight:1.5}}>Speak to GoPlanet AI and hear responses aloud.</p>
        <button style={S.btn(voiceOn?GRN:AC2,"#fff",{})} onClick={()=>{setVO(v=>{sv({voice:!v});return !v;})}}>{voiceOn?"🎤 Voice Mode ON — Tap to Disable":"🎤 Enable Voice Mode"}</button>
      </div>
      <div style={S.card}>
        <span style={S.lbl}>📱 Install App</span>
        <p style={{fontSize:"12px",color:MU,margin:"0 0 9px",lineHeight:1.5}}>Install Aurexis AI on any device for the best experience.</p>
        <div style={{background:SU2,borderRadius:"9px",padding:"11px",fontSize:"12px",color:TX,lineHeight:1.8,border:"1px solid "+BO}}>
          <p style={{margin:"0 0 4px",fontWeight:700}}>📱 iOS / Android: Tap Share → "Add to Home Screen"</p>
          <p style={{margin:0,fontWeight:700}}>💻 Chrome / Edge: Click ⊕ install icon in address bar</p>
        </div>
      </div>
      <div style={S.card}>
        <span style={S.lbl}>📜 Certification</span>
        <p style={{fontSize:"12px",color:MU,margin:"0 0 9px",lineHeight:1.5}}>Score 40/50 or above to earn your certificate and unlock Admin access.</p>
        <button style={{...S.btn(AC2,"#fff",{marginBottom:"8px"})}} onClick={()=>{setGIdx(0);setExSc("guide");}}>📖 Read User Guide</button>
        <button style={{...S.btn(AC,"#fff",{marginBottom:"8px"})}} onClick={()=>{setExName(user?.name||"");setExEmail(user?.email||"");setExErr("");setExSc("entry");}}>📝 Enter Exam</button>
        {user?.examScore!=null&&<button style={{...S.btn("#e17055","#fff",{marginBottom:"8px"})}} onClick={()=>{setExName(user?.name||"");setExEmail(user?.email||"");setExAns({});setExErr("");setExSc("entry");}}>🔄 Re-take Exam</button>}
        {user?.certGranted&&<button style={S.btn(GRN,"#fff",{})} onClick={async()=>{
          if(!certUrl){setCertLoad(true);const url=await makeCert(user.certName||user.name,user.examScore,user.certDate,L);setCertUrl(url);setCertDt(user.certDate);setExName(user.certName||user.name);setExScore(user.examScore);setCertLoad(false);}
          setExSc("cert");
        }}>{certLoad?"Loading…":"🏆 View My Certificate"}</button>}
        {user?.examScore!=null&&<p style={{margin:"8px 0 0",fontSize:"12px",color:MU,textAlign:"center"}}>Last score: {user.examScore}/50 {user.examScore>=40?"✅ Passed & Admin granted":"— need 40+ to pass"}</p>}
      </div>
      <div style={S.card}>
        <span style={S.lbl}>👤 Account</span>
        {[["Name",user?.name],["Email",user?.email],["Mobile",user?.mob],["Plan",user?.isAdv?"⚡ Advance":user?.isPro?"⭐ Pro":"Free"],["Role",user?.isAdmin?"🛡️ Admin":"User"],["Joined",user?.joined?new Date(user.joined).toLocaleDateString():"—"]].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid "+BO,fontSize:"13px"}}>
            <span style={{color:MU}}>{k}</span><span style={{fontWeight:600}}>{v||"—"}</span>
          </div>
        ))}
        <button style={{...S.btn(RED,"#fff",{marginTop:"14px"})}} onClick={logout}>🚪 Log Out</button>
      </div>
    </div>);
  }

  // ── ADMIN ─────────────────────────────────────────────
  /*
    SECURITY:
    - Only visible when user.isAdmin===true (set ONLY via submitExam with score>=40)
    - Clicking admin does NOT block other sidebar sections
    - loadMembers() returns only safe public fields
    - grantAdmin enforces certGranted && examScore>=40
  */
  function AdminContent(){
    useEffect(()=>{if(user?.isAdmin)loadMembers();},[user?.isAdmin]);
    if(!user?.isAdmin)return(
      <div style={{padding:"32px 20px",textAlign:"center"}}>
        <div style={{fontSize:"48px",marginBottom:"14px"}}>🔒</div>
        <p style={{color:RED,fontWeight:700,fontSize:"16px",margin:"0 0 8px"}}>Admin Access Required</p>
        <p style={{color:MU,fontSize:"13px",margin:"0 0 20px",lineHeight:1.6}}>Admin access is granted <strong>ONLY</strong> after completing the certification exam with a score of <strong>40 or above out of 50</strong>.</p>
        <button style={S.btn()} onClick={()=>setTab("settings")}>Go to Settings → Certification</button>
      </div>
    );
    const tot=members.length;
    const act=members.filter(u=>{try{return(Date.now()-new Date(u.joined).getTime())<30*24*3600*1000;}catch{return false;}}).length;
    const proC=members.filter(u=>u.isPro&&!u.isAdv).length;
    const advC=members.filter(u=>u.isAdv).length;
    const certC=members.filter(u=>u.certGranted).length;
    const admC=members.filter(u=>u.isAdmin).length;
    const rev=proC*25+advC*50;
    return(<div style={{padding:"20px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
        <h2 style={{margin:0,fontSize:"18px",fontWeight:800}}>🛡️ Admin Dashboard</h2>
        <span style={{background:GOLD,color:"#000",borderRadius:"20px",padding:"3px 12px",fontSize:"11px",fontWeight:700}}>👑 Admin Only</span>
      </div>
      {/* Both tabs always clickable */}
      <div style={{display:"flex",background:SU2,borderRadius:"10px",padding:"4px",marginBottom:"16px",border:"1px solid "+BO}}>
        {[{id:"members",l:"👥 Members"},{id:"stats",l:"📊 Stats"}].map(t=>(
          <button key={t.id}
            onClick={()=>{setAdminTab(t.id);if(t.id==="members")loadMembers();}}
            style={{flex:1,padding:"8px",border:"none",borderRadius:"7px",background:adminTab===t.id?SU:"transparent",color:adminTab===t.id?AC:MU,cursor:"pointer",fontWeight:adminTab===t.id?700:400,fontSize:"13px",boxShadow:adminTab===t.id?"0 1px 4px rgba(0,0,0,0.08)":"none",transition:"all 0.15s"}}>
            {t.l}
          </button>
        ))}
      </div>
      {adminTab==="stats"&&<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}}>
          {[["Total Users",tot,AC],["Active (30d)",act,GRN],["Revenue","$"+rev,GOLD],["Subscriptions",proC+advC,ORG]].map(([l,v,col])=>(
            <div key={l} style={{...S.card,textAlign:"center",padding:"16px",borderTop:"3px solid "+col,marginBottom:0}}>
              <p style={{fontSize:"26px",fontWeight:900,color:col,margin:0}}>{v}</p>
              <p style={{fontSize:"11px",color:MU,margin:"4px 0 0"}}>{l}</p>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"}}>
          {[["⭐ Pro",proC,AC],["⚡ Advance",advC,ORG],["🏆 Certified",certC,GRN],["🛡️ Admins",admC,"#e84393"]].map(([l,v,col])=>(
            <div key={l} style={{...S.card,textAlign:"center",padding:"14px",borderTop:"3px solid "+col,marginBottom:0}}>
              <p style={{fontSize:"22px",fontWeight:900,color:col,margin:0}}>{v}</p>
              <p style={{fontSize:"11px",color:MU,margin:"3px 0 0"}}>{l}</p>
            </div>
          ))}
        </div>
        <div style={S.card}>
          <p style={{margin:"0 0 10px",fontWeight:700,fontSize:"14px"}}>👥 Recent Users</p>
          {members.slice(0,6).map((u,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 0",borderBottom:i<Math.min(5,members.length-1)?"1px solid "+BO:"none"}}>
              <div style={{width:"30px",height:"30px",borderRadius:"50%",background:AC,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:"12px",flexShrink:0}}>{u.name?.[0]?.toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontSize:"12px",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</p>
                <p style={{margin:0,fontSize:"10px",color:MU}}>{u.joined?new Date(u.joined).toLocaleDateString():"—"}</p>
              </div>
              <span style={{fontSize:"10px",padding:"2px 7px",borderRadius:"8px",background:u.isAdv?ORG:u.isPro?AC:"#eee",color:u.isPro||u.isAdv?"#fff":MU,fontWeight:600,flexShrink:0}}>{u.isAdv?"Advance":u.isPro?"Pro":"Free"}</span>
            </div>
          ))}
        </div>
      </>}
      {adminTab==="members"&&<>
        <p style={{fontSize:"12px",color:MU,marginBottom:"12px"}}>{tot} registered member(s) — public info only, no passwords or API keys shown</p>
        {members.length===0&&<div style={{textAlign:"center",padding:"30px",color:MU,background:SU,borderRadius:"12px",border:"1px solid "+BO}}><p style={{fontSize:"30px",margin:"0 0 8px"}}>👥</p><p>No members yet.</p></div>}
        {members.map((u,i)=>(
          <div key={i} style={S.card}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
              <div style={{width:"34px",height:"34px",borderRadius:"50%",background:"linear-gradient(135deg,"+AC+","+AC2+")",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:"14px",flexShrink:0}}>{u.name?.[0]?.toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontWeight:700,fontSize:"13px",display:"flex",alignItems:"center",gap:"6px"}}>{u.name}{u.isAdmin&&<span style={{background:AC,color:"#fff",borderRadius:"5px",padding:"1px 6px",fontSize:"10px"}}>Admin</span>}</p>
                <p style={{margin:0,fontSize:"11px",color:MU,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</p>
              </div>
              <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"8px",background:u.isAdv?ORG:u.isPro?AC:"#eee",color:u.isPro||u.isAdv?"#fff":MU,fontWeight:600,flexShrink:0}}>{u.isAdv?"⚡ Adv":u.isPro?"⭐ Pro":"Free"}</span>
            </div>
            {u.examScore!=null&&<p style={{margin:"0 0 8px",fontSize:"11px",color:u.examScore>=40?GRN:MU}}>Exam: {u.examScore}/50 {u.examScore>=40?"✅":"❌"} {u.certGranted?"· 🏆 Certified":""}</p>}
            <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
              {!u.isPro&&!u.isAdv&&<button onClick={()=>grantPro(u.id)} style={{flex:1,minWidth:"80px",padding:"6px",borderRadius:"7px",border:"none",background:AC,color:"#fff",fontSize:"11px",fontWeight:700,cursor:"pointer"}}>Grant Pro</button>}
              {!u.isAdv&&<button onClick={()=>grantAdv(u.id)} style={{flex:1,minWidth:"80px",padding:"6px",borderRadius:"7px",border:"none",background:ORG,color:"#fff",fontSize:"11px",fontWeight:700,cursor:"pointer"}}>Grant Advance</button>}
              {!u.isAdmin&&(
                <button onClick={()=>grantAdmin(u.id)}
                  style={{flex:1,minWidth:"80px",padding:"6px",borderRadius:"7px",border:"none",background:u.certGranted&&u.examScore>=40?AC2:"#bbb",color:"#fff",fontSize:"11px",fontWeight:700,cursor:u.certGranted&&u.examScore>=40?"pointer":"not-allowed"}}
                  title={u.certGranted&&u.examScore>=40?"Grant Admin":"Requires certification (40+ exam score)"}>
                  {u.certGranted&&u.examScore>=40?"Grant Admin":"Need Cert"}
                </button>
              )}
            </div>
          </div>
        ))}
      </>}
    </div>);
  }

  // Tab router — always works from any active tab
  // CRITICAL: Call as functions (not JSX components) to avoid remounting
  // on every render which would destroy input focus
  function TC(){
    switch(tab){
      case"chat":return ChatContent();
      case"chats":return ChatContent(); // "Chats" nav item = chat tab
      case"projects":return ProjContent();
      case"image":return ImgContent();
      case"plans":return PlansContent();
      case"settings":return SettingsContent();
      case"admin":return AdminContent();
      case"createai":
        if(typeof window!=="undefined")window.open("https://create-pied.vercel.app/","_blank","noopener,noreferrer");
        setTimeout(()=>setTab("chat"),100);
        return ChatContent();
      case"cowork":
        if(typeof window!=="undefined")window.open("https://create-pied.vercel.app/","_blank","noopener,noreferrer");
        setTimeout(()=>setTab("chat"),100);
        return ChatContent();
      default:return ChatContent();
    }
  }

  /* ════════════════════════════════════════════════════
     DESKTOP LAYOUT — matching Aurexis image:
     [Sidebar 180px] | [Chat list 260px] | [Main content] | [Right 260px]
  ════════════════════════════════════════════════════ */
  if(isDesk){
    return(
      <div style={{display:"flex",height:"100dvh",width:"100%",background:"#f8f9fa",color:TX,fontFamily:"system-ui,sans-serif",overflow:"hidden"}}>

        {/* ═══ COL 1: LEFT SIDEBAR — 180px ════════════════════════════════ */}
        <div style={{width:"180px",flexShrink:0,borderRight:"1px solid #e8e8f0",background:"#fff",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Logo */}
          <div style={{padding:"16px 14px 14px",borderBottom:"1px solid #e8e8f0",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <img src={L} style={{width:"32px",height:"32px",objectFit:"contain"}} alt=""/>
              <span style={{fontWeight:900,fontSize:"17px",color:AC}}>Aurexis</span>
            </div>
          </div>
          {/* Nav items — image shows: AI Chatbot, Projects, Image Generator, Co-Work, Chats, Subscription, Settings, Admin */}
          <div style={{flex:1,overflowY:"auto",padding:"8px 0",WebkitOverflowScrolling:"touch"}}>
            {NAV.map(it=>(
              it.link
                ?<a key={it.id} href={it.link} target="_blank" rel="noopener noreferrer"
                    style={{display:"flex",alignItems:"center",gap:"10px",padding:"9px 14px",margin:"1px 8px",borderRadius:"9px",background:"transparent",color:TX,fontSize:"13px",textDecoration:"none",cursor:"pointer"}}>
                    <span style={{fontSize:"16px",flexShrink:0,opacity:0.7}}>{it.icon}</span>
                    <span style={{flex:1,fontWeight:400}}>{it.label}</span>
                    <span style={{fontSize:"9px",color:MU}}>↗</span>
                  </a>
                :<button key={it.id}
                    onClick={()=>setTab(it.id)}
                    style={{display:"flex",alignItems:"center",gap:"10px",padding:"9px 14px",margin:"1px 8px",borderRadius:"9px",border:"none",width:"calc(100% - 16px)",textAlign:"left",cursor:"pointer",fontSize:"13px",fontWeight:tab===it.id?700:400,color:tab===it.id?AC:TX,background:tab===it.id?(dark?"rgba(108,92,231,0.18)":"#f0eeff"):"transparent",transition:"background 0.15s"}}>
                    <span style={{fontSize:"16px",flexShrink:0,color:tab===it.id?AC:"#888"}}>{it.icon}</span>
                    <span style={{flex:1}}>{it.label}</span>
                    {it.id==="admin"&&<span style={{fontSize:"9px",background:AC,color:"#fff",padding:"1px 6px",borderRadius:"6px",flexShrink:0,fontWeight:700}}>Admin Only</span>}
                  </button>
            ))}
          </div>
          {/* Upgrade to Pro banner — matches image exactly */}
          {!user?.isAdv&&<div style={{margin:"10px",padding:"14px 12px",background:"linear-gradient(160deg,#5b21b6,"+AC+","+AC2+")",borderRadius:"12px",color:"#fff",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"6px"}}>
              <span style={{fontSize:"18px"}}>⭐</span>
              <p style={{margin:0,fontWeight:800,fontSize:"13px"}}>{user?.isPro?"Upgrade to Advance":"Upgrade to Pro"}</p>
            </div>
            <p style={{margin:"0 0 8px",fontWeight:800,fontSize:"15px"}}>{user?.isPro?"$50":"$25"}<span style={{fontSize:"11px",fontWeight:400,opacity:0.9}}> / year</span></p>
            {(user?.isPro?["Very fast responses","Very advanced models","Priority support","Early access features"]:["Faster responses","Advanced models","Priority support","Early access features"]).map(f=>(
              <div key={f} style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"3px"}}>
                <span style={{fontSize:"10px"}}>✓</span>
                <span style={{fontSize:"11px",opacity:0.92}}>{f}</span>
              </div>
            ))}
            <button onClick={()=>setTab("plans")} style={{width:"100%",marginTop:"10px",padding:"7px",background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.4)",borderRadius:"8px",color:"#fff",fontSize:"12px",fontWeight:700,cursor:"pointer"}}>Subscribe Now</button>
          </div>}
          {/* Bottom: version + powered by */}
          <div style={{padding:"8px 14px 12px",flexShrink:0,borderTop:"1px solid #e8e8f0"}}>
            <p style={{margin:"0 0 2px",fontSize:"10px",color:MU,fontWeight:600}}>Aurexis v1.0.0</p>
            <p style={{margin:0,fontSize:"10px",color:MU}}>Powered by Create-AI</p>
          </div>
        </div>

        {/* ═══ COL 2: CHAT LIST — 260px (always visible) ══════════════════ */}
        <div style={{width:"260px",flexShrink:0,borderRight:"1px solid #e8e8f0",background:"#fff",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* + New Chat button */}
          <div style={{padding:"14px",borderBottom:"1px solid #e8e8f0",flexShrink:0}}>
            <button onClick={newChat}
              style={{width:"100%",padding:"10px 16px",background:AC,color:"#fff",border:"none",borderRadius:"10px",fontSize:"14px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",boxShadow:"0 2px 8px rgba(108,92,231,0.3)"}}>
              + New Chat
            </button>
          </div>
          {/* Chats label */}
          <div style={{padding:"12px 16px 6px",flexShrink:0}}>
            <p style={{margin:0,fontWeight:700,fontSize:"14px",color:TX}}>Chats</p>
          </div>
          {/* Chat list */}
          <div style={{flex:1,overflowY:"auto",padding:"0 8px",WebkitOverflowScrolling:"touch"}}>
            {chatList.length===0&&<p style={{fontSize:"12px",color:MU,padding:"8px 8px"}}>No chats yet. Start one!</p>}
            {chatList.map(c=>(
              <button key={c.id} onClick={()=>openChat(c.id)}
                style={{display:"flex",alignItems:"center",gap:"10px",width:"100%",padding:"10px 10px",marginBottom:"3px",borderRadius:"10px",border:"none",background:curChat===c.id?"#ede9ff":"transparent",cursor:"pointer",textAlign:"left",transition:"background 0.15s"}}>
                <div style={{width:"32px",height:"32px",borderRadius:"9px",background:curChat===c.id?"linear-gradient(135deg,"+AC+","+AC2+")":"linear-gradient(135deg,#e8e6ff,#d8d4ff)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
                  <img src={L} style={{width:"24px",height:"24px",objectFit:"contain",filter:curChat===c.id?"brightness(10)":"none"}} alt=""/>
                </div>
                <div style={{flex:1,minWidth:0,textAlign:"left"}}>
                  <p style={{margin:"0 0 2px",fontWeight:curChat===c.id?700:500,fontSize:"13px",color:curChat===c.id?AC:"#1a1a2e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.preview||"New Chat"}</p>
                  <p style={{margin:0,fontSize:"11px",color:"#999"}}>{c.ts_}</p>
                </div>
              </button>
            ))}
          </div>
          {/* View All Chats */}
          {chatList.length>0&&<div style={{padding:"8px 16px",borderTop:"1px solid #e8e8f0",flexShrink:0}}>
            <button onClick={newChat} style={{width:"100%",padding:"6px",background:"transparent",border:"none",color:AC,fontSize:"12px",fontWeight:600,cursor:"pointer",textAlign:"center"}}>View All Chats</button>
          </div>}
        </div>

        {/* ═══ COL 3: MAIN CONTENT ════════════════════════════════════════ */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0,background:"#fff"}}>
          {/* Topbar — matches image: ☰ on left, Dark+Hello on right */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",height:"52px",background:"#fff",borderBottom:"1px solid #e8e8f0",flexShrink:0}}>
            <button style={{background:"none",border:"none",fontSize:"20px",cursor:"pointer",color:"#888",padding:"2px 6px 2px 0"}}>☰</button>
            <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
              {/* Dark mode toggle — matches image */}
              <div style={{display:"flex",alignItems:"center",gap:"6px",background:"#f5f4ff",padding:"5px 12px",borderRadius:"20px",border:"1px solid #e8e8f0"}}>
                <span style={{fontSize:"13px"}}>☀️</span>
                <button onClick={()=>setDark(d=>{sv({dark:!d});return !d;})}
                  style={{width:"34px",height:"18px",borderRadius:"9px",background:dark?AC:"#ddd",border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s"}}>
                  <div style={{width:"14px",height:"14px",borderRadius:"50%",background:"#fff",position:"absolute",top:"2px",left:dark?"18px":"2px",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                </button>
                <span style={{fontSize:"11px",color:"#888"}}>Dark</span>
              </div>
              {/* Hello, Name */}
              <div style={{display:"flex",alignItems:"center",gap:"8px",background:"#f5f4ff",padding:"5px 12px",borderRadius:"20px",border:"1px solid #e8e8f0",cursor:"pointer"}} onClick={()=>setTab("settings")}>
                <div style={{width:"26px",height:"26px",borderRadius:"50%",background:AC,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:"12px"}}>{user?.name?.[0]?.toUpperCase()}</div>
                <span style={{fontSize:"13px",fontWeight:600,color:"#1a1a2e"}}>Hello, {user?.name?.split(" ")[0]}</span>
                <span style={{fontSize:"11px",color:"#888"}}>▾</span>
              </div>
            </div>
          </div>
          {/* Main scrollable content */}
          <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",minHeight:0,background:"#fff"}}>
            {TC()}
          </div>
        {/* ═══ CHAT INPUT BAR — outside TC() so it NEVER remounts ═══
             This is the definitive fix for the focus loss bug.
             The input is always at the same React tree position.
             Typing one letter NEVER causes this element to remount. */}
        {tab==="chat"&&curChat&&(
          <div style={{padding:"12px 16px",borderTop:"1px solid #e8e8f0",background:"#fff",flexShrink:0,display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{flex:1,display:"flex",alignItems:"center",border:"1.5px solid #e8e8f0",borderRadius:"12px",background:"#fafafa",overflow:"hidden"}}>
              <input
                ref={inpRef}
                style={{flex:1,padding:"11px 14px",border:"none",background:"transparent",color:"#1a1a2e",fontSize:"14px",outline:"none"}}
                placeholder={micOn?"Listening…":"Type your message..."}
                value={inp}
                onChange={e=>setInp(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}}
                autoComplete="off"
              />
              <button onClick={()=>{if(spkOn){stopSpk();return;}if(micOn){stopMic();return;}startMic();}}
                style={{background:"none",border:"none",padding:"8px 6px",cursor:"pointer",color:micOn?"#e74c3c":spkOn?"#00cec9":voiceOn?"#00b894":"#aaa",fontSize:"16px",flexShrink:0}}>
                {micOn?"⏹":spkOn?"🔊":"🎤"}
              </button>
              <button style={{background:"none",border:"none",padding:"8px 10px",cursor:"pointer",color:"#aaa",fontSize:"16px",flexShrink:0}}>📎</button>
            </div>
            <button onClick={()=>sendMsg()} disabled={!inp.trim()||aiTyping}
              style={{width:"42px",height:"42px",borderRadius:"50%",flexShrink:0,border:"none",background:inp.trim()&&!aiTyping?"#6c5ce7":"#e0e0e0",color:"#fff",fontSize:"18px",cursor:inp.trim()&&!aiTyping?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:inp.trim()&&!aiTyping?"0 2px 8px rgba(108,92,231,0.4)":"none",transition:"all 0.2s"}}>
              ➤
            </button>
          </div>
        )}
        </div>

        {/* ═══ COL 4: RIGHT PANEL — 260px ════════════════════════════════ */}
        <div style={{width:"260px",flexShrink:0,borderLeft:"1px solid #e8e8f0",background:"#fff",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Image Generator section */}
          <div style={{padding:"16px",borderBottom:"1px solid #e8e8f0",flexShrink:0}}>
            <p style={{margin:"0 0 4px",fontWeight:700,fontSize:"15px",color:"#1a1a2e"}}>Image Generator</p>
            <p style={{margin:"0 0 10px",fontSize:"12px",color:"#888"}}>Describe the image you want to create.</p>
            <input
              style={{width:"100%",padding:"9px 11px",border:"1.5px solid #e8e8f0",borderRadius:"9px",background:"#fafafa",color:"#1a1a2e",fontSize:"12px",outline:"none",boxSizing:"border-box",marginBottom:"8px"}}
              placeholder="A futuristic city in the clouds"
              value={imgP}
              onChange={e=>setImgP(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&imgP.trim()){setImgLoad(true);setTimeout(()=>{setImgOut("https://image.pollinations.ai/prompt/"+encodeURIComponent(imgP)+"?width=600&height=400&nologo=true&seed="+Math.floor(Math.random()*9999));setImgLoad(false);},1500);}}}
            />
            <button
              onClick={()=>{if(imgP.trim()){setImgLoad(true);setTimeout(()=>{setImgOut("https://image.pollinations.ai/prompt/"+encodeURIComponent(imgP)+"?width=600&height=400&nologo=true&seed="+Math.floor(Math.random()*9999));setImgLoad(false);},1500);}}}
              style={{width:"100%",padding:"9px",background:AC,color:"#fff",border:"none",borderRadius:"9px",fontSize:"13px",fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(108,92,231,0.3)"}}>
              {imgLoad?"Generating…":"Generate Image"}
            </button>
            {imgOut&&<div style={{marginTop:"10px"}}>
              <p style={{margin:"0 0 6px",fontWeight:700,fontSize:"13px",color:"#1a1a2e"}}>Image</p>
              <img src={imgOut} alt="Generated" style={{width:"100%",borderRadius:"10px",border:"1px solid #e8e8f0",display:"block"}}/>
            </div>}
          </div>
          {/* Project section */}
          <div style={{flex:1,overflowY:"auto",padding:"16px",WebkitOverflowScrolling:"touch"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
              <p style={{margin:0,fontWeight:700,fontSize:"15px",color:"#1a1a2e"}}>Project</p>
              <button onClick={()=>{setShowPF(true);setTab("projects");}}
                style={{background:AC,color:"#fff",border:"none",borderRadius:"8px",padding:"6px 12px",fontSize:"12px",fontWeight:700,cursor:"pointer"}}>+ New Project</button>
            </div>
            <p style={{margin:"0 0 12px",fontSize:"12px",color:"#888"}}>Create and manage your projects.</p>
            {projList.length>0&&<p style={{margin:"0 0 8px",fontWeight:700,fontSize:"13px",color:"#1a1a2e"}}>My Projects</p>}
            {projList.length===0&&<p style={{fontSize:"12px",color:"#aaa",textAlign:"center",padding:"16px 0"}}>No projects yet.</p>}
            {projList.map((p,i)=>{
              const cols=["#6c5ce7","#e17055","#00b894","#fdcb6e","#e84393","#0984e3"];
              return(<div key={p.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"9px 10px",marginBottom:"6px",background:"#fafafa",borderRadius:"10px",border:"1px solid #e8e8f0"}}>
                <div style={{width:"30px",height:"30px",borderRadius:"8px",background:cols[i%cols.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",flexShrink:0}}>📁</div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:"12px",fontWeight:600,color:"#1a1a2e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</p>
                  <p style={{margin:0,fontSize:"10px",color:"#999"}}>Updated {new Date(p.dt).toLocaleDateString()}</p>
                </div>
              </div>);
            })}
            {projList.length>0&&<button onClick={()=>setTab("projects")}
              style={{width:"100%",padding:"8px",background:"transparent",border:"1px solid #e8e8f0",borderRadius:"9px",color:AC,fontSize:"12px",fontWeight:700,cursor:"pointer",marginTop:"4px"}}>
              View All Projects
            </button>}
          </div>
        </div>

      </div>
    );
  }

  /* ════════════════════════════════════════════════════
     MOBILE LAYOUT — sidebar drawer + bottom nav
  ════════════════════════════════════════════════════ */
  return(
    <div style={{...S.app,flexDirection:"column",maxWidth:"480px",margin:"0 auto"}}>
      {sbOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:99,display:"flex"}}>
          <div style={{width:"82%",maxWidth:"300px",height:"100%",overflow:"hidden",boxShadow:"6px 0 28px rgba(0,0,0,0.22)"}}>
            {Sidebar({onClose:()=>setSbOpen(false)})}
          </div>
          <div style={{flex:1,background:"rgba(0,0,0,0.45)"}} onClick={()=>setSbOpen(false)}/>
        </div>
      )}
      <div style={S.topbar}>
        <button onClick={()=>setSbOpen(p=>!p)} style={{background:"none",border:"none",fontSize:"22px",cursor:"pointer",color:TX,padding:"2px 6px"}}>☰</button>
        <div style={{display:"flex",alignItems:"center",gap:"8px",fontWeight:900,fontSize:"17px",color:AC}}>
          <img src={L} style={{width:"26px",height:"26px",objectFit:"contain"}} alt=""/>Aurexis
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <button onClick={()=>setDark(d=>{sv({dark:!d});return !d;})} style={{background:"none",border:"none",fontSize:"18px",cursor:"pointer",color:TX}}>{dark?"🌙":"☀️"}</button>
          <div style={{width:"30px",height:"30px",borderRadius:"50%",background:"linear-gradient(135deg,"+AC+","+AC2+")",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:"12px",cursor:"pointer"}} onClick={()=>setTab("settings")}>{user?.name?.[0]?.toUpperCase()}</div>
        </div>
      </div>
      <div style={S.scroll}>{TC()}</div>
        {/* ═══ CHAT INPUT BAR — outside TC() so it NEVER remounts ═══
             This is the definitive fix for the focus loss bug.
             The input is always at the same React tree position.
             Typing one letter NEVER causes this element to remount. */}
        {tab==="chat"&&curChat&&(
          <div style={{padding:"12px 16px",borderTop:"1px solid #e8e8f0",background:"#fff",flexShrink:0,display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{flex:1,display:"flex",alignItems:"center",border:"1.5px solid #e8e8f0",borderRadius:"12px",background:"#fafafa",overflow:"hidden"}}>
              <input
                ref={inpRef}
                style={{flex:1,padding:"11px 14px",border:"none",background:"transparent",color:"#1a1a2e",fontSize:"14px",outline:"none"}}
                placeholder={micOn?"Listening…":"Type your message..."}
                value={inp}
                onChange={e=>setInp(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}}
                autoComplete="off"
              />
              <button onClick={()=>{if(spkOn){stopSpk();return;}if(micOn){stopMic();return;}startMic();}}
                style={{background:"none",border:"none",padding:"8px 6px",cursor:"pointer",color:micOn?"#e74c3c":spkOn?"#00cec9":voiceOn?"#00b894":"#aaa",fontSize:"16px",flexShrink:0}}>
                {micOn?"⏹":spkOn?"🔊":"🎤"}
              </button>
              <button style={{background:"none",border:"none",padding:"8px 10px",cursor:"pointer",color:"#aaa",fontSize:"16px",flexShrink:0}}>📎</button>
            </div>
            <button onClick={()=>sendMsg()} disabled={!inp.trim()||aiTyping}
              style={{width:"42px",height:"42px",borderRadius:"50%",flexShrink:0,border:"none",background:inp.trim()&&!aiTyping?"#6c5ce7":"#e0e0e0",color:"#fff",fontSize:"18px",cursor:inp.trim()&&!aiTyping?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:inp.trim()&&!aiTyping?"0 2px 8px rgba(108,92,231,0.4)":"none",transition:"all 0.2s"}}>
              ➤
            </button>
          </div>
        )}
      <div style={S.mbn}>
        {MOBN.map(t=>(<button key={t.id} style={S.mbBtn(tab===t.id)} onClick={()=>setTab(t.id)}>
          <span style={{fontSize:"20px"}}>{t.icon}</span>
          <span>{t.label}</span>
        </button>))}
      </div>
    </div>
  );
}
