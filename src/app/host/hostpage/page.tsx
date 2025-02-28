//src/app/host/hostpage/page.tsx


"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle, Bell, Menu, CircleUserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HostPage() {
  const router = useRouter();

  return (
    <div className="h-screen flex flex-col items-center bg-[#f9f9f9]">
      {/* Navbar */}
      <div className="w-full max-w-3xl flex items-center justify-between p-4 bg-[#4a3aff] text-white shadow-md">
        <Menu className="w-6 h-6 text-white" />
        <div className="flex items-center space-x-4">
          <Bell className="w-6 h-6 text-white" />
          <CircleUserRound className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 w-full max-w-3xl">
        {/* Create Activity */}
        <Card
          className="p-4 border-dashed border-2 border-[#4a3aff] bg-white flex items-center justify-center cursor-pointer"
          onClick={() => router.push("/host/createactivity")}
        >
          <Button variant="outline" className="flex items-center text-[#4a3aff] border-[#4a3aff] hover:bg-[#4a3aff] hover:text-white">
            <PlusCircle className="w-5 h-5 mr-2" /> Create Activity
          </Button>
        </Card>

        {/* Active Activities */}
        <section>
          <h2 className="text-lg font-semibold text-[#333]">Active Activity</h2>
          <Card className="border border-[#ddd] bg-white shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-[#4a3aff] rounded-full"></span>
                <p className="font-medium text-[#333]">Activity Name</p>
              </div>
              <p className="text-sm text-gray-500">Started on: 12:00 am</p>
              <p className="text-sm text-gray-500">Ends on: 1:00 pm</p>
            </CardContent>
          </Card>
          <Button variant="outline" className="w-full mt-2 text-[#4a3aff] border-[#4a3aff] hover:bg-[#4a3aff] hover:text-white">View all</Button>
        </section>

        {/* Pending Evaluations */}
        <section>
          <h2 className="text-lg font-semibold text-[#333]">Pending Evaluation</h2>
          <Card className="border border-[#ddd] bg-white shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-[#4a3aff] rounded-full"></span>
                <p className="font-medium text-[#333]">Pending Evaluation</p>
              </div>
              <p className="text-sm text-gray-500">Session Name</p>
              <p className="text-sm text-gray-500">Session End Time</p>
            </CardContent>
          </Card>
          <Button variant="outline" className="w-full mt-2 text-[#4a3aff] border-[#4a3aff] hover:bg-[#4a3aff] hover:text-white">View all</Button>
        </section>

        {/* Draft Activities */}
        <section>
          <h2 className="text-lg font-semibold text-[#333]">Draft Activity</h2>
          <Card className="border border-[#ddd] bg-white shadow-md">
            <CardContent className="p-4">
              <p className="font-medium text-[#333]">Activity Name (ex: GD 101)</p>
              <p className="text-sm text-gray-500">Activity Details</p>
              <Button variant="link" className="p-0 text-[#4a3aff]">Schedule</Button>
            </CardContent>
          </Card>
          <Button variant="outline" className="w-full mt-2 text-[#4a3aff] border-[#4a3aff] hover:bg-[#4a3aff] hover:text-white">View all</Button>
        </section>

        {/* Previous Activities */}
        <section>
          <h2 className="text-lg font-semibold text-[#333]">Previous Activity</h2>
          <Card className="border border-[#ddd] bg-white shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-[#4a3aff] rounded-full"></span>
                <p className="font-medium text-[#333]">Activity Name</p>
              </div>
              <p className="text-sm text-gray-500">Activity Participated Date</p>
            </CardContent>
          </Card>
          <Button variant="outline" className="w-full mt-2 text-[#4a3aff] border-[#4a3aff] hover:bg-[#4a3aff] hover:text-white">View all</Button>
        </section>
      </div>
    </div>
  );
}






























// "use client";

// import { useRouter } from "next/navigation";
// import { Card, CardContent } from "@/components/ui/card";
// import { PlusCircle, Bell, Menu, CircleUserRound } from "lucide-react";

// import { Button } from "@/components/ui/button";

// export default function HostPage() {
//   const router = useRouter();

//   return (
//     <div className="h-screen flex flex-col items-center">
//       {/* Navbar */}
//       <div className="w-full max-w-3xl flex items-center justify-between p-4 border-b">
//         <Menu className="w-6 h-6" />
//         <div className="flex items-center space-x-4">
//           <Bell className="w-6 h-6" />
//           <CircleUserRound className="w-6 h-6" />
//         </div>
//       </div>

//       {/* Scrollable Content */}
//       <div className="flex-1 overflow-y-auto p-4 space-y-6 w-full max-w-3xl">
//         {/* Create Activity */}
//         <Card
//           className="p-4 border-dashed border-2 border-gray-300 flex items-center justify-center cursor-pointer"
//           onClick={() => router.push("/host/createactivity")}
//         >
//           <Button variant="outline" className="flex items-center">
//             <PlusCircle className="w-5 h-5 mr-2" /> Create Activity
//           </Button>
//         </Card>

//         {/* Active Activities */}
//         <section>
//           <h2 className="text-lg font-semibold">Active Activity</h2>
//           <Card>
//             <CardContent className="p-4">
//               <div className="flex items-center space-x-2">
//                 <span className="w-3 h-3 bg-black rounded-full"></span>
//                 <p className="font-medium">Activity Name</p>
//               </div>
//               <p className="text-sm text-gray-500">Started on: 12:00 am</p>
//               <p className="text-sm text-gray-500">Ends on: 1:00 pm</p>
//             </CardContent>
//           </Card>
//           <Button variant="outline" className="w-full mt-2">View all</Button>
//         </section>

//         {/* Pending Evaluations */}
//         <section>
//           <h2 className="text-lg font-semibold">Pending Evaluation</h2>
//           <Card>
//             <CardContent className="p-4">
//               <div className="flex items-center space-x-2">
//                 <span className="w-3 h-3 bg-black rounded-full"></span>
//                 <p className="font-medium">Pending Evaluation</p>
//               </div>
//               <p className="text-sm text-gray-500">Session Name</p>
//               <p className="text-sm text-gray-500">Session End Time</p>
//             </CardContent>
//           </Card>
//           <Button variant="outline" className="w-full mt-2">View all</Button>
//         </section>

//         {/* Draft Activities */}
//         <section>
//           <h2 className="text-lg font-semibold">Draft Activity</h2>
//           <Card>
//             <CardContent className="p-4">
//               <p className="font-medium">Activity Name (ex: GD 101)</p>
//               <p className="text-sm text-gray-500">Activity Details</p>
//               <Button variant="link" className="p-0">Schedule</Button>
//             </CardContent>
//           </Card>
//           <Button variant="outline" className="w-full mt-2">View all</Button>
//         </section>

//         {/* Previous Activities */}
//         <section>
//           <h2 className="text-lg font-semibold">Previous Activity</h2>
//           <Card>
//             <CardContent className="p-4">
//               <div className="flex items-center space-x-2">
//                 <span className="w-3 h-3 bg-black rounded-full"></span>
//                 <p className="font-medium">Activity Name</p>
//               </div>
//               <p className="text-sm text-gray-500">Activity Participated Date</p>
//             </CardContent>
//           </Card>
//           <Button variant="outline" className="w-full mt-2">View all</Button>
//         </section>
//       </div>
//     </div>
//   );
// }
