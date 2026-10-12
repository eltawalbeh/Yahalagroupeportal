import svgPaths from "./svg-yjwidu99bd";

function Icon() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_87_1458)" id="Icon">
          <path d={svgPaths.p363df2c0} id="Vector" stroke="var(--stroke-0, #1A1A1A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
        <defs>
          <clipPath id="clip0_87_1458">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function CardTitle() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0" data-name="CardTitle">
      <Icon />
      <p className="font-['Arial:Regular',sans-serif] leading-[16px] not-italic relative shrink-0 text-[#1a1a1a] text-[16px] text-nowrap whitespace-pre">Server Connectivity Test</p>
    </div>
  );
}

function CardDescription() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center relative shrink-0" data-name="CardDescription">
      <p className="font-['Arial:Regular',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#6c757d] text-[16px] text-nowrap whitespace-pre">Test server endpoints to diagnose connection issues</p>
    </div>
  );
}

function CardHeader() {
  return (
    <div className="relative shrink-0 w-full" data-name="CardHeader">
      <div className="size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[6px] items-start px-[24px] py-[17px] relative w-full">
          <CardTitle />
          <CardDescription />
        </div>
      </div>
    </div>
  );
}

function BoldText() {
  return (
    <div className="content-stretch flex h-full items-center relative shrink-0 w-[90px]" data-name="Bold Text">
      <p className="font-['Arial:Bold',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#1a1a1a] text-[14px] text-nowrap whitespace-pre">Project ID:</p>
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex gap-[16px] items-end relative shrink-0 w-full">
      <div className="flex flex-row items-end self-stretch">
        <BoldText />
      </div>
      <p className="font-['Arial:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#1a1a1a] text-[14px] w-[150px]">dswhelykqnybaoimjgeh</p>
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="Container">
      <Frame1 />
    </div>
  );
}

function BoldText1() {
  return (
    <div className="content-stretch flex items-center relative self-stretch shrink-0 w-[90px]" data-name="Bold Text">
      <p className="font-['Arial:Bold',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#1a1a1a] text-[14px] text-nowrap whitespace-pre">Base URL:</p>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex gap-[16px] items-start relative shrink-0">
      <BoldText1 />
      <p className="font-['Arial:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#1a1a1a] text-[14px] w-[500px]">https://dswhelykqnybaoimjgeh.supabase.co/functions/v1/make-server-fdcde35a</p>
    </div>
  );
}

function ServerConnectivityTest() {
  return (
    <div className="bg-[#e9ecef] h-[68px] relative rounded-[12px] shrink-0 w-full" data-name="ServerConnectivityTest">
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col gap-[4px] h-[68px] items-start pb-0 pt-[12px] px-[12px] relative w-full">
          <Container />
          <Frame />
        </div>
      </div>
    </div>
  );
}

function Heading2() {
  return (
    <div className="h-[24px] relative shrink-0 w-full" data-name="Heading 4">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#1a1a1a] text-[16px] text-nowrap top-[-2.2px] whitespace-pre">/health endpoint</p>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-0 not-italic text-[#6c757d] text-[14px] text-nowrap top-[-1.2px] whitespace-pre">Basic server health check</p>
    </div>
  );
}

function Container1() {
  return (
    <div className="h-[44px] relative shrink-0 w-[153.038px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col h-[44px] items-start relative w-[153.038px]">
        <Heading2 />
        <Paragraph />
      </div>
    </div>
  );
}

function Badge() {
  return (
    <div className="h-[21.587px] relative rounded-[10px] shrink-0 w-[75.3px]" data-name="Badge">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[4px] h-[21.587px] items-center justify-center overflow-clip px-[8.8px] py-[2.8px] relative rounded-[inherit] w-[75.3px]">
        <p className="font-['Arial:Regular',sans-serif] leading-[16px] not-italic relative shrink-0 text-[#1a1a1a] text-[12px] text-nowrap whitespace-pre">Not tested</p>
      </div>
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[10px]" />
    </div>
  );
}

function Container2() {
  return (
    <div className="content-stretch flex h-[44px] items-center justify-between relative shrink-0 w-full" data-name="Container">
      <Container1 />
      <Badge />
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#f8f9fa] relative rounded-[10px] shrink-0 w-full" data-name="Button">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="box-border content-stretch flex gap-[8px] items-center justify-center px-[39px] py-[5px] relative w-full">
          <p className="font-['Arial:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#1a1a1a] text-[14px] text-center text-nowrap whitespace-pre">Test Health Endpoint</p>
        </div>
      </div>
    </div>
  );
}

function ServerConnectivityTest1() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] h-[84px] items-start relative shrink-0 w-full" data-name="ServerConnectivityTest">
      <Container2 />
      <Button />
    </div>
  );
}

function Heading3() {
  return (
    <div className="h-[24px] relative shrink-0 w-full" data-name="Heading 4">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#1a1a1a] text-[16px] text-nowrap top-[-2.2px] whitespace-pre">/admin/password-reset-requests endpoint</p>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-0 not-italic text-[#6c757d] text-[14px] text-nowrap top-[-1.2px] whitespace-pre">Password reset requests API</p>
    </div>
  );
}

function Container3() {
  return (
    <div className="h-[44px] relative shrink-0 w-[306.75px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col h-[44px] items-start relative w-[306.75px]">
        <Heading3 />
        <Paragraph1 />
      </div>
    </div>
  );
}

function Badge1() {
  return (
    <div className="h-[21.587px] relative rounded-[10px] shrink-0 w-[75.3px]" data-name="Badge">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[4px] h-[21.587px] items-center justify-center overflow-clip px-[8.8px] py-[2.8px] relative rounded-[inherit] w-[75.3px]">
        <p className="font-['Arial:Regular',sans-serif] leading-[16px] not-italic relative shrink-0 text-[#1a1a1a] text-[12px] text-nowrap whitespace-pre">Not tested</p>
      </div>
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[10px]" />
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex h-[44px] items-center justify-between relative shrink-0 w-full" data-name="Container">
      <Container3 />
      <Badge1 />
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[#f8f9fa] relative rounded-[10px] shrink-0 w-full" data-name="Button">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="box-border content-stretch flex gap-[8px] items-center justify-center px-[2px] py-[5px] relative w-full">
          <p className="font-['Arial:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#1a1a1a] text-[14px] text-nowrap whitespace-pre">Test Password Resets Endpoint</p>
        </div>
      </div>
    </div>
  );
}

function ServerConnectivityTest2() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] h-[84px] items-start relative shrink-0 w-full" data-name="ServerConnectivityTest">
      <Container4 />
      <Button1 />
    </div>
  );
}

function BoldText2() {
  return (
    <div className="content-stretch flex h-[18.4px] items-start relative shrink-0 w-[112px]" data-name="Bold Text">
      <p className="font-['Arial:Bold',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#1c398e] text-[14px] text-nowrap whitespace-pre">Troubleshooting:</p>
    </div>
  );
}

function ListItem() {
  return (
    <div className="relative shrink-0 w-full" data-name="List Item">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="box-border content-stretch flex gap-[8px] items-center justify-center p-[8px] relative w-full">
          <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-[19.6px] not-italic text-[#1c398e] text-[14px] text-nowrap top-[-1.2px] whitespace-pre">If health check fails, the Supabase Edge Function may not be deployed</p>
        </div>
      </div>
    </div>
  );
}

function ListItem1() {
  return (
    <div className="box-border content-stretch flex gap-[8px] items-center justify-center px-[20px] py-0 relative shrink-0" data-name="List Item">
      <p className="font-['Arial:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#1c398e] text-[14px] text-nowrap whitespace-pre">Check the browser console for detailed error messages</p>
    </div>
  );
}

function ListItem2() {
  return (
    <div className="box-border content-stretch flex gap-[8px] items-center justify-center px-[20px] py-0 relative shrink-0" data-name="List Item">
      <p className="font-['Arial:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#1c398e] text-[14px] text-nowrap whitespace-pre">Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct</p>
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0">
      <ListItem />
      <ListItem1 />
      <ListItem2 />
    </div>
  );
}

function List() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] h-[68px] items-start relative shrink-0 w-full" data-name="List">
      <Frame2 />
    </div>
  );
}

function ServerConnectivityTest3() {
  return (
    <div className="bg-blue-50 relative rounded-[12px] shrink-0 w-full" data-name="ServerConnectivityTest">
      <div aria-hidden="true" className="absolute border-[#bedbff] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col gap-[9px] items-start p-[13px] relative w-full">
          <BoldText2 />
          <List />
        </div>
      </div>
    </div>
  );
}

function CardContent() {
  return (
    <div className="relative shrink-0 w-full" data-name="CardContent">
      <div className="size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[16px] items-start px-[28px] py-0 relative w-full">
          <ServerConnectivityTest />
          <ServerConnectivityTest1 />
          <ServerConnectivityTest2 />
          <ServerConnectivityTest3 />
        </div>
      </div>
    </div>
  );
}

function Card() {
  return (
    <div className="bg-white box-border content-stretch flex flex-col gap-[24px] items-start px-[0.8px] py-[30.8px] relative rounded-[16px] shrink-0 w-[703px]" data-name="Card">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <CardHeader />
      <CardContent />
    </div>
  );
}

function Icon1() {
  return (
    <div className="absolute left-0 size-[20px] top-0" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p756c900} id="Vector" stroke="var(--stroke-0, #1A1A1A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M17.5 1.66667L9.5 9.66667" id="Vector_2" stroke="var(--stroke-0, #1A1A1A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p21f2c800} id="Vector_3" stroke="var(--stroke-0, #1A1A1A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function CardTitle1() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="CardTitle">
      <Icon1 />
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[16px] left-[28px] not-italic text-[#1a1a1a] text-[16px] text-nowrap top-[-0.2px] whitespace-pre">Password Reset Requests</p>
    </div>
  );
}

function CardDescription1() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="CardDescription">
      <p className="font-['Arial:Regular',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#6c757d] text-[16px] text-nowrap whitespace-pre">Manage employee password reset requests</p>
    </div>
  );
}

function CardHeader1() {
  return (
    <div className="box-border content-stretch flex flex-col gap-[6px] items-start px-0 py-[16px] relative shrink-0 w-full" data-name="CardHeader">
      <CardTitle1 />
      <CardDescription1 />
    </div>
  );
}

function Icon2() {
  return (
    <div className="relative shrink-0 size-[48px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 48">
        <g id="Icon" opacity="0.5">
          <path d="M24 12V24L32 28" id="Vector" stroke="var(--stroke-0, #6C757D)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          <path d={svgPaths.p1f337080} id="Vector_2" stroke="var(--stroke-0, #6C757D)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        </g>
      </svg>
    </div>
  );
}

function Paragraph2() {
  return (
    <div className="relative shrink-0 w-full" data-name="Paragraph">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="box-border content-stretch flex gap-[8px] items-center justify-center px-[412px] py-0 relative w-full">
          <p className="font-['Arial:Regular',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#6c757d] text-[16px] text-center text-nowrap whitespace-pre">No pending password reset requests</p>
        </div>
      </div>
    </div>
  );
}

function PasswordResetRequests() {
  return (
    <div className="box-border content-stretch flex flex-col gap-[12px] items-center px-0 py-[32px] relative shrink-0 w-full" data-name="PasswordResetRequests">
      <Icon2 />
      <Paragraph2 />
    </div>
  );
}

function Card1() {
  return (
    <div className="bg-white relative rounded-[16px] shrink-0 w-full" data-name="Card">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-col items-center size-full">
        <div className="box-border content-stretch flex flex-col gap-[24px] items-center px-[32px] py-[30px] relative w-full">
          <CardHeader1 />
          <PasswordResetRequests />
        </div>
      </div>
    </div>
  );
}

function Icon3() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p2566d000} id="Vector" stroke="var(--stroke-0, #7AC143)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p1bf79e00} id="Vector_2" stroke="var(--stroke-0, #7AC143)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Heading1() {
  return (
    <div className="h-[24px] relative shrink-0 w-[58.087px]" data-name="Heading 3">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[24px] relative w-[58.087px]">
        <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#1a1a1a] text-[16px] text-nowrap top-[-2.2px] whitespace-pre">Security</p>
      </div>
    </div>
  );
}

function AdminSettings() {
  return (
    <div className="h-[24px] relative shrink-0" data-name="AdminSettings">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[8px] h-[24px] items-center relative">
        <Icon3 />
        <Heading1 />
      </div>
    </div>
  );
}

function Heading4() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center relative shrink-0" data-name="Heading 4">
      <p className="font-['Arial:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#1a1a1a] text-[14px] text-nowrap whitespace-pre">Admin Password</p>
    </div>
  );
}

function Paragraph3() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center relative shrink-0" data-name="Paragraph">
      <p className="font-['Arial:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#6c757d] text-[14px] text-nowrap whitespace-pre">Change your admin password for better security</p>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0">
      <Heading4 />
      <Paragraph3 />
    </div>
  );
}

function Icon4() {
  return (
    <div className="absolute left-[12px] size-[16px] top-[10px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p18f7f580} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p368b4180} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[#7ac143] h-[36px] relative rounded-[10px] shrink-0 w-[167.6px]" data-name="Button">
      <Icon4 />
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-[44px] not-italic text-[14px] text-nowrap text-white top-[6.8px] whitespace-pre">Change Password</p>
    </div>
  );
}

function AdminSettings1() {
  return (
    <div className="relative shrink-0" data-name="AdminSettings">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[36px] items-start relative">
        <Frame3 />
        <Button2 />
      </div>
    </div>
  );
}

function Card2() {
  return (
    <div className="bg-white h-[245px] relative rounded-[16px] shrink-0 w-full" data-name="Card">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col gap-[48px] h-[245px] items-start px-[32.8px] py-[24.8px] relative w-full">
          <AdminSettings />
          <AdminSettings1 />
        </div>
      </div>
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-[414px]">
      <Card1 />
      <Card2 />
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex gap-[18px] items-center relative shrink-0 w-full">
      <Card />
      <Frame4 />
    </div>
  );
}

function Icon5() {
  return (
    <div className="absolute left-0 size-[20px] top-0" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p24d83580} id="Vector" stroke="var(--stroke-0, #7AC143)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.pd919a80} id="Vector_2" stroke="var(--stroke-0, #7AC143)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function CardTitle2() {
  return (
    <div className="absolute h-[20px] left-[24px] top-[24px] w-[1085.6px]" data-name="CardTitle">
      <Icon5 />
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[16px] left-[28px] not-italic text-[#1a1a1a] text-[16px] text-nowrap top-[-0.2px] whitespace-pre">Email System Tester</p>
    </div>
  );
}

function CardDescription2() {
  return (
    <div className="absolute h-[24px] left-[24px] top-[50px] w-[1085.6px]" data-name="CardDescription">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#6c757d] text-[16px] text-nowrap top-[-2.2px] whitespace-pre">Send test emails to verify Resend API configuration</p>
    </div>
  );
}

function CardHeader2() {
  return (
    <div className="h-[74px] relative shrink-0 w-[1133.6px]" data-name="CardHeader">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[74px] relative w-[1133.6px]">
        <CardTitle2 />
        <CardDescription2 />
      </div>
    </div>
  );
}

function Icon6() {
  return (
    <div className="absolute left-0 size-[20px] top-[2px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p1e34ef00} id="Vector" stroke="var(--stroke-0, #155DFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Heading5() {
  return (
    <div className="h-[24px] relative shrink-0 w-full" data-name="Heading 4">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#1c398e] text-[16px] text-nowrap top-[-2.2px] whitespace-pre">📚 Quick Setup Guide</p>
    </div>
  );
}

function Link() {
  return (
    <div className="absolute content-stretch flex h-[18.4px] items-start left-[80.95px] top-[0.8px] w-[71.388px]" data-name="Link">
      <p className="[text-underline-position:from-font] decoration-solid font-['Arial:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#193cb8] text-[14px] text-nowrap underline whitespace-pre">resend.com</p>
    </div>
  );
}

function ListItem3() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="List Item">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-[14.43px] not-italic text-[#193cb8] text-[14px] text-nowrap top-[-1.2px] whitespace-pre">Sign up at</p>
      <Link />
    </div>
  );
}

function ListItem4() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="List Item">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-[14.43px] not-italic text-[#193cb8] text-[14px] text-nowrap top-[-1.2px] whitespace-pre">Create an API key in the Resend dashboard</p>
    </div>
  );
}

function ListItem5() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="List Item">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-[14.43px] not-italic text-[#193cb8] text-[14px] text-nowrap top-[-1.2px] whitespace-pre">Add your API key to RESEND_API_KEY environment variable (already created)</p>
    </div>
  );
}

function ListItem6() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="List Item">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-[14.43px] not-italic text-[#193cb8] text-[14px] text-nowrap top-[-1.2px] whitespace-pre">Test below to verify emails are sending</p>
    </div>
  );
}

function NumberedList() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] h-[98px] items-start relative shrink-0 w-full" data-name="Numbered List">
      <ListItem3 />
      <ListItem4 />
      <ListItem5 />
      <ListItem6 />
    </div>
  );
}

function Icon7() {
  return (
    <div className="absolute left-0 size-[16px] top-[2px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d="M10 2H14V6" id="Vector" stroke="var(--stroke-0, #155DFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M6.66667 9.33333L14 2" id="Vector_2" stroke="var(--stroke-0, #155DFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p25f66900} id="Vector_3" stroke="var(--stroke-0, #155DFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Link1() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Link">
      <Icon7 />
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-[24px] not-italic text-[#155dfc] text-[14px] text-nowrap top-[-1.2px] whitespace-pre">View Complete Setup Guide (EMAIL_SETUP.md)</p>
    </div>
  );
}

function Container5() {
  return (
    <div className="h-[36.8px] relative shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#bedbff] border-[0.8px_0px_0px] border-solid inset-0 pointer-events-none" />
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col h-[36.8px] items-start pb-0 pl-0 pr-[694.4px] pt-[13.2px] relative w-full">
          <Link1 />
        </div>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] h-[178.8px] items-start left-[32px] top-0 w-[1018.4px]" data-name="Container">
      <Heading5 />
      <NumberedList />
      <Container5 />
    </div>
  );
}

function Container7() {
  return (
    <div className="h-[178.8px] relative shrink-0 w-full" data-name="Container">
      <Icon6 />
      <Container6 />
    </div>
  );
}

function EmailTester() {
  return (
    <div className="absolute bg-gradient-to-r box-border content-stretch flex flex-col from-[#eff6ff] h-[214px] items-start left-[24px] pb-[1.6px] pt-[17.6px] px-[17.6px] rounded-[12px] to-[#eef2ff] top-0 w-[1085.6px]" data-name="EmailTester">
      <div aria-hidden="true" className="absolute border-[#bedbff] border-[1.6px] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <Container7 />
    </div>
  );
}

function Icon8() {
  return (
    <div className="absolute left-0 size-[20px] top-[2px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p4e97b00} id="Vector" stroke="var(--stroke-0, #7AC143)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Heading6() {
  return (
    <div className="h-[24px] relative shrink-0 w-full" data-name="Heading 4">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#7ac143] text-[16px] text-nowrap top-[-2.2px] whitespace-pre">Resend API Configured</p>
    </div>
  );
}

function Paragraph4() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-0 not-italic text-[#6c757d] text-[14px] text-nowrap top-[-1.2px] whitespace-pre">Email system is now using Resend API for reliable email delivery. Make sure RESEND_API_KEY is set.</p>
    </div>
  );
}

function Container8() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] h-[48px] items-start left-[32px] top-0 w-[610.3px]" data-name="Container">
      <Heading6 />
      <Paragraph4 />
    </div>
  );
}

function Container9() {
  return (
    <div className="h-[48px] relative shrink-0 w-full" data-name="Container">
      <Icon8 />
      <Container8 />
    </div>
  );
}

function EmailTester1() {
  return (
    <div className="absolute bg-[rgba(122,193,67,0.1)] box-border content-stretch flex flex-col h-[81.6px] items-start left-[24px] pb-[0.8px] pt-[16.8px] px-[16.8px] rounded-[12px] top-[238px] w-[1085.6px]" data-name="EmailTester">
      <div aria-hidden="true" className="absolute border-[0.8px] border-[rgba(122,193,67,0.2)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <Container9 />
    </div>
  );
}

function PrimitiveLabel() {
  return (
    <div className="content-stretch flex gap-[8px] h-[14px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Arial:Regular',sans-serif] leading-[14px] not-italic relative shrink-0 text-[#1a1a1a] text-[14px] text-nowrap whitespace-pre">Recipient Email Address</p>
    </div>
  );
}

function Input() {
  return (
    <div className="bg-white h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Input">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex h-[36px] items-center px-[12px] py-[4px] relative w-full">
          <p className="font-['Arial:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#6c757d] text-[14px] text-nowrap whitespace-pre">example@yahala.co</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[10px]" />
    </div>
  );
}

function Paragraph5() {
  return (
    <div className="content-stretch flex h-[15.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#6c757d] text-[12px]">Enter your email address to receive the test message</p>
    </div>
  );
}

function Container10() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] h-[81.987px] items-start relative shrink-0 w-full" data-name="Container">
      <PrimitiveLabel />
      <Input />
      <Paragraph5 />
    </div>
  );
}

function PrimitiveLabel1() {
  return (
    <div className="content-stretch flex gap-[8px] h-[14px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Arial:Regular',sans-serif] leading-[14px] not-italic relative shrink-0 text-[#1a1a1a] text-[14px] text-nowrap whitespace-pre">Email Template</p>
    </div>
  );
}

function PrimitiveSpan() {
  return (
    <div className="h-[20px] relative shrink-0 w-[114.138px]" data-name="Primitive.span">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[8px] h-[20px] items-center overflow-clip relative rounded-[inherit] w-[114.138px]">
        <p className="font-['Arial:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#1a1a1a] text-[14px] text-nowrap whitespace-pre">Request Approved</p>
      </div>
    </div>
  );
}

function Icon9() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon" opacity="0.5">
          <path d="M4 6L8 10L12 6" id="Vector" stroke="var(--stroke-0, #6C757D)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function PrimitiveButton() {
  return (
    <div className="bg-white h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Primitive.button">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex h-[36px] items-center justify-between px-[12.8px] py-[0.8px] relative w-full">
          <PrimitiveSpan />
          <Icon9 />
        </div>
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] h-[58px] items-start left-0 top-0 w-[534.8px]" data-name="Container">
      <PrimitiveLabel1 />
      <PrimitiveButton />
    </div>
  );
}

function PrimitiveLabel2() {
  return (
    <div className="content-stretch flex gap-[8px] h-[14px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Arial:Regular',sans-serif] leading-[14px] not-italic relative shrink-0 text-[#1a1a1a] text-[14px] text-nowrap whitespace-pre">Email Language</p>
    </div>
  );
}

function PrimitiveSpan1() {
  return (
    <div className="h-[20px] relative shrink-0 w-[43.9px]" data-name="Primitive.span">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[8px] h-[20px] items-center overflow-clip relative rounded-[inherit] w-[43.9px]">
        <p className="font-['Arial:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#1a1a1a] text-[14px] text-nowrap whitespace-pre">English</p>
      </div>
    </div>
  );
}

function Icon10() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon" opacity="0.5">
          <path d="M4 6L8 10L12 6" id="Vector" stroke="var(--stroke-0, #6C757D)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function PrimitiveButton1() {
  return (
    <div className="bg-white h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Primitive.button">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex h-[36px] items-center justify-between px-[12.8px] py-[0.8px] relative w-full">
          <PrimitiveSpan1 />
          <Icon10 />
        </div>
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] h-[58px] items-start left-[550.8px] top-0 w-[534.8px]" data-name="Container">
      <PrimitiveLabel2 />
      <PrimitiveButton1 />
    </div>
  );
}

function Container13() {
  return (
    <div className="h-[58px] relative shrink-0 w-full" data-name="Container">
      <Container11 />
      <Container12 />
    </div>
  );
}

function Icon11() {
  return (
    <div className="absolute left-[477.52px] size-[16px] top-[12px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_87_1377)" id="Icon">
          <path d={svgPaths.pb7a5200} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p3370bc40} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_87_1377">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button3() {
  return (
    <div className="bg-[#7ac143] h-[40px] opacity-50 relative rounded-[10px] shrink-0 w-full" data-name="Button">
      <Icon11 />
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-[509.52px] not-italic text-[14px] text-nowrap text-white top-[8.8px] whitespace-pre">Send Test Email</p>
    </div>
  );
}

function EmailTester2() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[16px] h-[211.988px] items-start left-[24px] top-[343.6px] w-[1085.6px]" data-name="EmailTester">
      <Container10 />
      <Container13 />
      <Button3 />
    </div>
  );
}

function Heading7() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Heading 4">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-0 not-italic text-[#1a1a1a] text-[14px] text-nowrap top-[-1.2px] whitespace-pre">Available Templates:</p>
    </div>
  );
}

function Container14() {
  return (
    <div className="absolute content-stretch flex h-[15.988px] items-start left-[8.8px] top-[8.8px] w-[505.2px]" data-name="Container">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#1a1a1a] text-[12px]">Request Submitted Successfully</p>
    </div>
  );
}

function Container15() {
  return (
    <div className="absolute content-stretch flex h-[15.988px] items-start left-[8.8px] top-[24.79px] w-[505.2px]" data-name="Container">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#6c757d] text-[12px]">requestSubmitted</p>
    </div>
  );
}

function Container16() {
  return (
    <div className="absolute bg-[#f8f9fa] h-[49.575px] left-0 rounded-[4px] top-0 w-[522.8px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Container14 />
      <Container15 />
    </div>
  );
}

function Container17() {
  return (
    <div className="absolute content-stretch flex h-[15.988px] items-start left-[8.8px] top-[8.8px] w-[505.2px]" data-name="Container">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#1a1a1a] text-[12px]">Request Approved</p>
    </div>
  );
}

function Container18() {
  return (
    <div className="absolute content-stretch flex h-[15.988px] items-start left-[8.8px] top-[24.79px] w-[505.2px]" data-name="Container">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#6c757d] text-[12px]">requestApproved</p>
    </div>
  );
}

function Container19() {
  return (
    <div className="absolute bg-[#f8f9fa] h-[49.575px] left-[530.8px] rounded-[4px] top-0 w-[522.8px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Container17 />
      <Container18 />
    </div>
  );
}

function Container20() {
  return (
    <div className="absolute content-stretch flex h-[15.988px] items-start left-[8.8px] top-[8.8px] w-[505.2px]" data-name="Container">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#1a1a1a] text-[12px]">Request Rejected</p>
    </div>
  );
}

function Container21() {
  return (
    <div className="absolute content-stretch flex h-[15.988px] items-start left-[8.8px] top-[24.79px] w-[505.2px]" data-name="Container">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#6c757d] text-[12px]">requestRejected</p>
    </div>
  );
}

function Container22() {
  return (
    <div className="absolute bg-[#f8f9fa] h-[49.575px] left-0 rounded-[4px] top-[57.58px] w-[522.8px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Container20 />
      <Container21 />
    </div>
  );
}

function Container23() {
  return (
    <div className="absolute content-stretch flex h-[15.988px] items-start left-[8.8px] top-[8.8px] w-[505.2px]" data-name="Container">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#1a1a1a] text-[12px]">New Request Awaiting Your Approval</p>
    </div>
  );
}

function Container24() {
  return (
    <div className="absolute content-stretch flex h-[15.988px] items-start left-[8.8px] top-[24.79px] w-[505.2px]" data-name="Container">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#6c757d] text-[12px]">approvalNeeded</p>
    </div>
  );
}

function Container25() {
  return (
    <div className="absolute bg-[#f8f9fa] h-[49.575px] left-[530.8px] rounded-[4px] top-[57.58px] w-[522.8px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Container23 />
      <Container24 />
    </div>
  );
}

function Container26() {
  return (
    <div className="absolute content-stretch flex h-[15.988px] items-start left-[8.8px] top-[8.8px] w-[505.2px]" data-name="Container">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#1a1a1a] text-[12px]">Password Reset Request</p>
    </div>
  );
}

function Container27() {
  return (
    <div className="absolute content-stretch flex h-[15.988px] items-start left-[8.8px] top-[24.79px] w-[505.2px]" data-name="Container">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#6c757d] text-[12px]">passwordReset</p>
    </div>
  );
}

function Container28() {
  return (
    <div className="absolute bg-[#f8f9fa] h-[49.575px] left-0 rounded-[4px] top-[115.15px] w-[522.8px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Container26 />
      <Container27 />
    </div>
  );
}

function Container29() {
  return (
    <div className="absolute content-stretch flex h-[15.988px] items-start left-[8.8px] top-[8.8px] w-[505.2px]" data-name="Container">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#1a1a1a] text-[12px]">Welcome to Ya Hala Group E-Portal</p>
    </div>
  );
}

function Container30() {
  return (
    <div className="absolute content-stretch flex h-[15.988px] items-start left-[8.8px] top-[24.79px] w-[505.2px]" data-name="Container">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#6c757d] text-[12px]">employeeInvitation</p>
    </div>
  );
}

function Container31() {
  return (
    <div className="absolute bg-[#f8f9fa] h-[49.575px] left-[530.8px] rounded-[4px] top-[115.15px] w-[522.8px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Container29 />
      <Container30 />
    </div>
  );
}

function Container32() {
  return (
    <div className="content-stretch flex h-[15.988px] items-start relative shrink-0 w-full" data-name="Container">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#1a1a1a] text-[12px]">New Announcement</p>
    </div>
  );
}

function Container33() {
  return (
    <div className="content-stretch flex h-[15.988px] items-start relative shrink-0 w-full" data-name="Container">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#6c757d] text-[12px]">announcement</p>
    </div>
  );
}

function Container34() {
  return (
    <div className="absolute bg-[#f8f9fa] box-border content-stretch flex flex-col gap-[4.864e_-5px] h-[49.575px] items-start left-0 pb-[0.8px] pt-[8.8px] px-[8.8px] rounded-[4px] top-[172.72px] w-[522.8px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Container32 />
      <Container33 />
    </div>
  );
}

function Container35() {
  return (
    <div className="h-[222.3px] relative shrink-0 w-full" data-name="Container">
      <Container16 />
      <Container19 />
      <Container22 />
      <Container25 />
      <Container28 />
      <Container31 />
      <Container34 />
    </div>
  );
}

function EmailTester3() {
  return (
    <div className="absolute bg-[#e9ecef] box-border content-stretch flex flex-col gap-[8px] h-[282.3px] items-start left-[24px] pb-0 pt-[16px] px-[16px] rounded-[12px] top-[579.59px] w-[1085.6px]" data-name="EmailTester">
      <Heading7 />
      <Container35 />
    </div>
  );
}

function BoldText3() {
  return (
    <div className="absolute h-[18.4px] left-0 top-[0.8px] w-[64.912px]" data-name="Bold Text">
      <p className="absolute font-['Arial:Bold',sans-serif] leading-[20px] left-0 not-italic text-[#1a1a1a] text-[14px] top-[-2px] w-[65px]">ℹ️ Setup:</p>
    </div>
  );
}

function Paragraph6() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Paragraph">
      <BoldText3 />
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-[64.91px] not-italic text-[#1a1a1a] text-[14px] top-[-1.2px] w-[751px]">This system uses Resend API. Get your API key from resend.com and add it to the RESEND_API_KEY environment variable.</p>
    </div>
  );
}

function EmailTester4() {
  return (
    <div className="absolute box-border content-stretch flex flex-col h-[53.6px] items-start left-[24px] pb-[0.8px] pt-[16.8px] px-[16.8px] rounded-[12px] top-[885.89px] w-[1085.6px]" data-name="EmailTester">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <Paragraph6 />
    </div>
  );
}

function CardContent1() {
  return (
    <div className="h-[963.487px] relative shrink-0 w-[1133.6px]" data-name="CardContent">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[963.487px] relative w-[1133.6px]">
        <EmailTester />
        <EmailTester1 />
        <EmailTester2 />
        <EmailTester3 />
        <EmailTester4 />
      </div>
    </div>
  );
}

function Card3() {
  return (
    <div className="bg-white h-[1063.09px] relative rounded-[16px] shrink-0 w-full" data-name="Card">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col gap-[24px] h-[1063.09px] items-start p-[0.8px] relative w-full">
          <CardHeader2 />
          <CardContent1 />
        </div>
      </div>
    </div>
  );
}

function Icon12() {
  return (
    <div className="absolute left-0 size-[24px] top-[3.99px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="Icon">
          <path d={svgPaths.p169dda00} id="Vector" stroke="var(--stroke-0, #7AC143)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p3cccb600} id="Vector_2" stroke="var(--stroke-0, #7AC143)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Heading() {
  return (
    <div className="h-[31.988px] relative shrink-0 w-full" data-name="Heading 2">
      <Icon12 />
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[32px] left-[32px] not-italic text-[#1a1a1a] text-[24px] text-nowrap top-[-2px] whitespace-pre">Admin Settings</p>
    </div>
  );
}

function Paragraph7() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-0 not-italic text-[#6c757d] text-[14px] text-nowrap top-[-1.2px] whitespace-pre">Manage admin account and system settings</p>
    </div>
  );
}

function Container36() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] h-[55.987px] items-start relative shrink-0 w-full" data-name="Container">
      <Heading />
      <Paragraph7 />
    </div>
  );
}

function Icon13() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d="M10 16.6667V8.33333" id="Vector" stroke="var(--stroke-0, #7AC143)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M15 16.6667V3.33333" id="Vector_2" stroke="var(--stroke-0, #7AC143)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M5 16.6667V13.3333" id="Vector_3" stroke="var(--stroke-0, #7AC143)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Heading8() {
  return (
    <div className="h-[24px] relative shrink-0 w-[119.75px]" data-name="Heading 3">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[24px] relative w-[119.75px]">
        <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#1a1a1a] text-[16px] text-nowrap top-[-2.2px] whitespace-pre">System Statistics</p>
      </div>
    </div>
  );
}

function AdminSettings2() {
  return (
    <div className="h-[24px] relative shrink-0 w-[1085.6px]" data-name="AdminSettings">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[8px] h-[24px] items-center relative w-[1085.6px]">
        <Icon13 />
        <Heading8 />
      </div>
    </div>
  );
}

function Paragraph8() {
  return (
    <div className="content-stretch flex h-[31.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Bold',sans-serif] grow leading-[32px] min-h-px min-w-px not-italic relative shrink-0 text-[#7ac143] text-[24px] text-center">10</p>
    </div>
  );
}

function Paragraph9() {
  return (
    <div className="content-stretch flex h-[15.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#6c757d] text-[12px] text-center">Total Requests</p>
    </div>
  );
}

function Container37() {
  return (
    <div className="absolute bg-[#e9ecef] box-border content-stretch flex flex-col gap-[4px] h-[83.975px] items-start left-0 pb-0 pt-[16px] px-[16px] rounded-[12px] top-0 w-[259.4px]" data-name="Container">
      <Paragraph8 />
      <Paragraph9 />
    </div>
  );
}

function Paragraph10() {
  return (
    <div className="content-stretch flex h-[31.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Bold',sans-serif] grow leading-[32px] min-h-px min-w-px not-italic relative shrink-0 text-[#7ac143] text-[24px] text-center">1</p>
    </div>
  );
}

function Paragraph11() {
  return (
    <div className="content-stretch flex h-[15.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#6c757d] text-[12px] text-center">Employees</p>
    </div>
  );
}

function Container38() {
  return (
    <div className="absolute bg-[#e9ecef] box-border content-stretch flex flex-col gap-[4px] h-[83.975px] items-start left-[275.4px] pb-0 pt-[16px] px-[16px] rounded-[12px] top-0 w-[259.4px]" data-name="Container">
      <Paragraph10 />
      <Paragraph11 />
    </div>
  );
}

function Paragraph12() {
  return (
    <div className="content-stretch flex h-[31.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Bold',sans-serif] grow leading-[32px] min-h-px min-w-px not-italic relative shrink-0 text-[#7ac143] text-[24px] text-center">0</p>
    </div>
  );
}

function Paragraph13() {
  return (
    <div className="content-stretch flex h-[15.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#6c757d] text-[12px] text-center">Documents</p>
    </div>
  );
}

function Container39() {
  return (
    <div className="absolute bg-[#e9ecef] box-border content-stretch flex flex-col gap-[4px] h-[83.975px] items-start left-[550.8px] pb-0 pt-[16px] px-[16px] rounded-[12px] top-0 w-[259.4px]" data-name="Container">
      <Paragraph12 />
      <Paragraph13 />
    </div>
  );
}

function Paragraph14() {
  return (
    <div className="content-stretch flex h-[31.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Bold',sans-serif] grow leading-[32px] min-h-px min-w-px not-italic relative shrink-0 text-[#7ac143] text-[24px] text-center">0</p>
    </div>
  );
}

function Paragraph15() {
  return (
    <div className="content-stretch flex h-[15.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#6c757d] text-[12px] text-center">Announcements</p>
    </div>
  );
}

function Container40() {
  return (
    <div className="absolute bg-[#e9ecef] box-border content-stretch flex flex-col gap-[4px] h-[83.975px] items-start left-[826.2px] pb-0 pt-[16px] px-[16px] rounded-[12px] top-0 w-[259.4px]" data-name="Container">
      <Paragraph14 />
      <Paragraph15 />
    </div>
  );
}

function Paragraph16() {
  return (
    <div className="content-stretch flex h-[31.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Bold',sans-serif] grow leading-[32px] min-h-px min-w-px not-italic relative shrink-0 text-[#e17100] text-[24px] text-center">0</p>
    </div>
  );
}

function Paragraph17() {
  return (
    <div className="content-stretch flex h-[15.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#6c757d] text-[12px] text-center">Pending Requests</p>
    </div>
  );
}

function Container41() {
  return (
    <div className="absolute bg-[#e9ecef] box-border content-stretch flex flex-col gap-[4px] h-[83.975px] items-start left-0 pb-0 pt-[16px] px-[16px] rounded-[12px] top-[99.97px] w-[259.4px]" data-name="Container">
      <Paragraph16 />
      <Paragraph17 />
    </div>
  );
}

function Paragraph18() {
  return (
    <div className="content-stretch flex h-[31.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Bold',sans-serif] grow leading-[32px] min-h-px min-w-px not-italic relative shrink-0 text-[#1a1a1a] text-[24px] text-center">1</p>
    </div>
  );
}

function Paragraph19() {
  return (
    <div className="content-stretch flex h-[15.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#6c757d] text-[12px] text-center">Comments</p>
    </div>
  );
}

function Container42() {
  return (
    <div className="absolute bg-[#e9ecef] box-border content-stretch flex flex-col gap-[4px] h-[83.975px] items-start left-[275.4px] pb-0 pt-[16px] px-[16px] rounded-[12px] top-[99.97px] w-[259.4px]" data-name="Container">
      <Paragraph18 />
      <Paragraph19 />
    </div>
  );
}

function Paragraph20() {
  return (
    <div className="content-stretch flex h-[31.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Bold',sans-serif] grow leading-[32px] min-h-px min-w-px not-italic relative shrink-0 text-[#1a1a1a] text-[24px] text-center">22</p>
    </div>
  );
}

function Paragraph21() {
  return (
    <div className="content-stretch flex h-[15.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#6c757d] text-[12px] text-center">Notifications</p>
    </div>
  );
}

function Container43() {
  return (
    <div className="absolute bg-[#e9ecef] box-border content-stretch flex flex-col gap-[4px] h-[83.975px] items-start left-[550.8px] pb-0 pt-[16px] px-[16px] rounded-[12px] top-[99.97px] w-[259.4px]" data-name="Container">
      <Paragraph20 />
      <Paragraph21 />
    </div>
  );
}

function Paragraph22() {
  return (
    <div className="content-stretch flex h-[31.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Bold',sans-serif] grow leading-[32px] min-h-px min-w-px not-italic relative shrink-0 text-[#1a1a1a] text-[24px] text-center">2</p>
    </div>
  );
}

function Paragraph23() {
  return (
    <div className="content-stretch flex h-[15.988px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="basis-0 font-['Arial:Regular',sans-serif] grow leading-[16px] min-h-px min-w-px not-italic relative shrink-0 text-[#6c757d] text-[12px] text-center">Companies</p>
    </div>
  );
}

function Container44() {
  return (
    <div className="absolute bg-[#e9ecef] box-border content-stretch flex flex-col gap-[4px] h-[83.975px] items-start left-[826.2px] pb-0 pt-[16px] px-[16px] rounded-[12px] top-[99.97px] w-[259.4px]" data-name="Container">
      <Paragraph22 />
      <Paragraph23 />
    </div>
  );
}

function AdminSettings3() {
  return (
    <div className="h-[183.95px] relative shrink-0 w-[1085.6px]" data-name="AdminSettings">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[183.95px] relative w-[1085.6px]">
        <Container37 />
        <Container38 />
        <Container39 />
        <Container40 />
        <Container41 />
        <Container42 />
        <Container43 />
        <Container44 />
      </div>
    </div>
  );
}

function Card4() {
  return (
    <div className="bg-white h-[297.55px] relative rounded-[16px] shrink-0 w-full" data-name="Card">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col gap-[40px] h-[297.55px] items-start pb-[0.8px] pl-[24.8px] pr-[0.8px] pt-[24.8px] relative w-full">
          <AdminSettings2 />
          <AdminSettings3 />
        </div>
      </div>
    </div>
  );
}

function Icon14() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p3af16b00} id="Vector" stroke="var(--stroke-0, #DC3545)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M10 7.5V10.8333" id="Vector_2" stroke="var(--stroke-0, #DC3545)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M10 14.1667H10.0083" id="Vector_3" stroke="var(--stroke-0, #DC3545)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Heading9() {
  return (
    <div className="h-[24px] relative shrink-0 w-[94.412px]" data-name="Heading 3">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[24px] relative w-[94.412px]">
        <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#dc3545] text-[16px] text-nowrap top-[-2.2px] whitespace-pre">Danger Zone</p>
      </div>
    </div>
  );
}

function AdminSettings4() {
  return (
    <div className="absolute content-stretch flex gap-[8px] h-[24px] items-center left-[24.8px] top-[24.8px] w-[1085.6px]" data-name="AdminSettings">
      <Icon14 />
      <Heading9 />
    </div>
  );
}

function Heading10() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[1085.6px]" data-name="Heading 4">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-0 not-italic text-[#1a1a1a] text-[14px] text-nowrap top-[-1.2px] whitespace-pre">Reset All Data</p>
    </div>
  );
}

function Paragraph24() {
  return (
    <div className="absolute h-[20px] left-0 top-[28px] w-[1085.6px]" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-0 not-italic text-[#6c757d] text-[14px] text-nowrap top-[-1.2px] whitespace-pre">Delete all requests, notifications, comments, documents, and announcements. Employee and company data will be preserved.</p>
    </div>
  );
}

function Icon15() {
  return (
    <div className="absolute left-[12px] size-[16px] top-[10px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d="M6.66667 7.33333V11.3333" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M9.33334 7.33333V11.3333" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.pe122280} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M2 4H14" id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p1e857b40} id="Vector_5" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Button4() {
  return (
    <div className="absolute bg-[#dc3545] h-[36px] left-0 rounded-[10px] top-[60px] w-[144.45px]" data-name="Button">
      <Icon15 />
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-[44px] not-italic text-[14px] text-nowrap text-white top-[6.8px] whitespace-pre">Reset All Data</p>
    </div>
  );
}

function AdminSettings5() {
  return (
    <div className="absolute h-[96px] left-[24.8px] top-[174.4px] w-[1085.6px]" data-name="AdminSettings">
      <Heading10 />
      <Paragraph24 />
      <Button4 />
    </div>
  );
}

function Icon16() {
  return (
    <div className="absolute left-[16.8px] size-[16px] top-[14.8px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p13358600} id="Vector" stroke="var(--stroke-0, #DC3545)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M8 6V8.66667" id="Vector_2" stroke="var(--stroke-0, #DC3545)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M8 11.3333H8.00667" id="Vector_3" stroke="var(--stroke-0, #DC3545)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function AlertDescription() {
  return (
    <div className="absolute h-[20px] left-[44.8px] top-[12.8px] w-[1024px]" data-name="AlertDescription">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[20px] left-0 not-italic text-[14px] text-[rgba(220,53,69,0.9)] text-nowrap top-[-1.2px] whitespace-pre">These actions are permanent and cannot be undone. Use with extreme caution!</p>
    </div>
  );
}

function Alert() {
  return (
    <div className="absolute bg-white h-[45.6px] left-[24.8px] rounded-[12px] top-[88.8px] w-[1085.6px]" data-name="Alert">
      <div aria-hidden="true" className="absolute border-[#dee2e6] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <Icon16 />
      <AlertDescription />
    </div>
  );
}

function Card5() {
  return (
    <div className="bg-white h-[295.2px] relative rounded-[16px] shrink-0 w-full" data-name="Card">
      <div aria-hidden="true" className="absolute border-[#dc3545] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <AdminSettings4 />
      <AdminSettings5 />
      <Alert />
    </div>
  );
}

function AdminSettings6() {
  return (
    <div className="content-stretch flex flex-col gap-[29px] items-start relative shrink-0 w-full" data-name="AdminSettings">
      <Container36 />
      <Card4 />
      <Card5 />
    </div>
  );
}

export default function Frame6() {
  return (
    <div className="content-stretch flex flex-col gap-[18px] items-start relative size-full">
      <Frame5 />
      <Card3 />
      <AdminSettings6 />
    </div>
  );
}