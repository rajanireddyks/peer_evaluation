// src/app/host/schedule/page.tsx

// src/app/host/schedule/page.tsx

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, RefreshCcw, Eye, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Data Type Definitions
// ---------------------------------------------------------------------------
interface Batch {
  _id: string; // from MongoDB (for attendance lookup)
  name: string; // used to query attendance records
  isDisabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

interface Student {
  _id: string;
  name: string;
  email: string;
}

interface AttendanceRecord {
  batchName: string;
  sessionId: string;
  sessionDate: string;
  sessionTime: string;
  instructorName: string;
  instructorEmail: string;
  studentName: string;
  studentEmail: string;
  attendanceStatus: string;
}

interface SessionInfo {
  sessionId: string;
  date: string;
  time: string;
}

// ---------------------------------------------------------------------------
// ScheduleActivityPage Component
// ---------------------------------------------------------------------------
export default function ScheduleActivityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ---------------------------------------------------------------------------
  // 1. Activity ID from Query
  // The activity we are scheduling for is provided via the URL query parameter "activityId".
  // This is the proper activity ID that exists in our relational database.
  // ---------------------------------------------------------------------------
  const [activityId, setActivityId] = useState<number | null>(null);
  useEffect(() => {
    // Check if searchParams exists before using it.
    if (!searchParams) return;
    const idFromQuery = searchParams.get("activityId");
    if (idFromQuery) {
      const parsed = parseInt(idFromQuery, 10);
      if (!isNaN(parsed)) {
        setActivityId(parsed);
      } else {
        console.error("Invalid activityId from query:", idFromQuery);
      }
    }
  }, [searchParams]);

  // ---------------------------------------------------------------------------
  // 2. Date & Time States for Schedule
  // ---------------------------------------------------------------------------
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("10:00 am");
  const [endTime, setEndTime] = useState("10:30 am");

  // ---------------------------------------------------------------------------
  // 3. Batches, Students & Session Info
  // We store the batch's _id (for internal use) and its name (for attendance lookup) separately.
  // ---------------------------------------------------------------------------
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");   // Used internally only
  const [selectedBatchName, setSelectedBatchName] = useState(""); // Used when fetching attendance records
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // ---------------------------------------------------------------------------
  // 4. Scheduling Details
  // ---------------------------------------------------------------------------
  const [groupType, setGroupType] = useState("");
  const [groupSize, setGroupSize] = useState("");

  // ---------------------------------------------------------------------------
  // 5. View Toggles and Saved State
  // ---------------------------------------------------------------------------
  const [isViewingStudents, setIsViewingStudents] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ---------------------------------------------------------------------------
  // 6. Error Handling State
  // ---------------------------------------------------------------------------
  const [errors, setErrors] = useState<{
    startDate?: string;
    endDate?: string;
    batch?: string;
    groupType?: string;
    groupSize?: string;
    general?: string;
  }>({});

  // ---------------------------------------------------------------------------
  // 7. Reference for Auto-Refresh Interval
  // ---------------------------------------------------------------------------
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ------------------------------------------------------------------------------
  // Fetch batches from the attendence API on component mount.
  // ------------------------------------------------------------------------------
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        console.log("Fetching batches...");
        const response = await fetch("/api/host/attendence/attendence");
        if (!response.ok) {
          throw new Error("Failed to fetch batches");
        }
        const data = await response.json();
        if (data.batches) {
          setBatches(data.batches);
          console.log("Batches fetched:", data.batches);
        }
      } catch (error) {
        console.error("Error fetching batches:", error);
      }
    };
    fetchBatches();
  }, []);

  // ------------------------------------------------------------------------------
  // Fetch present students and latest session info for the selected batch.
  // We use the batch name (selectedBatchName) for querying the attendence API.
  // ------------------------------------------------------------------------------
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedBatchName) {
        setSelectedStudents([]);
        setSessionInfo(null);
        setAttendanceRecords([]);
        return;
      }
      try {
        console.log("Fetching students for batch:", selectedBatchName);
        const response = await fetch(`/api/host/attendence/attendence?batchId=${selectedBatchName}`);
        if (!response.ok) {
          throw new Error("Failed to fetch students for batch");
        }
        const records: AttendanceRecord[] = await response.json();
        setAttendanceRecords(records);
        console.log("Attendance records received:", records);

        if (records.length > 0) {
          // Extract unique students using studentEmail as unique key.
          const uniqueStudents = Array.from(
            new Map(
              records.map(record => [
                record.studentEmail,
                {
                  _id: record.studentEmail,
                  name: record.studentName,
                  email: record.studentEmail,
                },
              ])
            ).values()
          );
          setSelectedStudents(uniqueStudents);
          // Use the first record for session info.
          setSessionInfo({
            sessionId: records[0].sessionId,
            date: records[0].sessionDate,
            time: records[0].sessionTime,
          });
          console.log("Fetched session info:", {
            sessionId: records[0].sessionId,
            date: records[0].sessionDate,
            time: records[0].sessionTime,
          });
        } else {
          setSelectedStudents([]);
          setSessionInfo(null);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
        setSelectedStudents([]);
        setSessionInfo(null);
      }
    };

    fetchStudents();
  }, [selectedBatchName]);

  // ------------------------------------------------------------------------------
  // Refresh Button: Re-fetch student list for the selected batch.
  // ------------------------------------------------------------------------------
  const refreshStudentList = useCallback(async () => {
    if (!selectedBatchName) return;
    setIsRefreshing(true);
    try {
      console.log("Refreshing student list for batch:", selectedBatchName);
      const response = await fetch(`/api/host/attendence/attendence?batchId=${selectedBatchName}`);
      if (!response.ok) {
        throw new Error("Failed to refresh student list");
      }
      const records: AttendanceRecord[] = await response.json();
      setAttendanceRecords(records);
      if (records.length > 0) {
        setSessionInfo({
          sessionId: records[0].sessionId,
          date: records[0].sessionDate,
          time: records[0].sessionTime,
        });
        const uniqueStudents = Array.from(
          new Map(
            records.map(record => [
              record.studentEmail,
              {
                _id: record.studentEmail,
                name: record.studentName,
                email: record.studentEmail,
              },
            ])
          ).values()
        );
        setSelectedStudents(uniqueStudents);
        console.log("Refreshed session info and students:", {
          sessionInfo: records[0],
          students: uniqueStudents,
        });
      } else {
        setSelectedStudents([]);
        setSessionInfo(null);
      }
    } catch (error) {
      console.error("Error refreshing student list:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedBatchName]);

  // ------------------------------------------------------------------------------
  // Auto-refresh the student list every 2 seconds when viewing students.
  // ------------------------------------------------------------------------------
  useEffect(() => {
    if (isViewingStudents) {
      console.log("Starting auto-refresh of student list every 2 seconds.");
      intervalRef.current = setInterval(refreshStudentList, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("Stopped auto-refresh of student list.");
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isViewingStudents, refreshStudentList]);

  // ------------------------------------------------------------------------------
  // Handle Save: Validate and save the schedule (POST to create, PUT to update).
  // ------------------------------------------------------------------------------
  const handleSave = async () => {
    const newErrors: typeof errors = {};
    let hasErrors = false;
    if (!startDate) {
      newErrors.startDate = "Start date is required";
      hasErrors = true;
    }
    if (!endDate) {
      newErrors.endDate = "End date is required";
      hasErrors = true;
    }
    if (!selectedBatchId || !selectedBatchName) {
      newErrors.batch = "Batch selection is required";
      hasErrors = true;
    }
    if (!groupType) {
      newErrors.groupType = "Group type is required";
      hasErrors = true;
    }
    if (!groupSize) {
      newErrors.groupSize = "Group size is required";
      hasErrors = true;
    }
    if (activityId === null) {
      newErrors.general = "Activity ID is missing from the URL.";
      hasErrors = true;
    }
    setErrors(newErrors);
    if (hasErrors) return;

    const startDateTime = parseDateTime(startDate, startTime);
    const endDateTime = parseDateTime(endDate, endTime);
    if (!startDateTime || !endDateTime) {
      setErrors((prev) => ({
        ...prev,
        general: "Could not parse start/end times.",
      }));
      return;
    }
    console.log("Scheduling from:", startDateTime, "to:", endDateTime);

    try {
      if (!isSaved) {
        // POST request to create a new schedule.
        console.log("POST schedule request with body:", {
          activityId,
          startTime: startDateTime,
          endTime: endDateTime,
          duration: Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000),
          status: "PENDING",
          scheduledAt: new Date(),
          evaluationType: groupType,
          groupSize: parseInt(groupSize, 10),
          totalStudents: selectedStudents.length,
        });
        const response = await fetch("/api/host/schedule/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            activityId, // Use the actual activityId from the query
            startTime: startDateTime,
            endTime: endDateTime,
            duration: Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000),
            status: "PENDING",
            scheduledAt: new Date(),
            evaluationType: groupType,
            groupSize: parseInt(groupSize, 10),
            totalStudents: selectedStudents.length,
          }),
        });
        if (!response.ok) {
          throw new Error("Failed to save schedule");
        }
        const data = await response.json();
        console.log("Schedule saved:", data);
        // Assume the saved schedule ID is returned as data.id.
        setSessionInfo({ sessionId: data.id, date: format(startDateTime, "PPP"), time: format(startDateTime, "p") });
        setIsSaved(true);
      } else {
        // PUT request to update an existing schedule.
        console.log("PUT schedule request with body:", {
          id: sessionInfo?.sessionId,
          activityId,
          startTime: startDateTime,
          endTime: endDateTime,
          duration: Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000),
          status: "PENDING",
          scheduledAt: new Date(),
          evaluationType: groupType,
          groupSize: parseInt(groupSize, 10),
          totalStudents: selectedStudents.length,
        });
        const response = await fetch("/api/host/schedule/session", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: sessionInfo?.sessionId,
            activityId,
            startTime: startDateTime,
            endTime: endDateTime,
            duration: Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000),
            status: "PENDING",
            scheduledAt: new Date(),
            evaluationType: groupType,
            groupSize: parseInt(groupSize, 10),
            totalStudents: selectedStudents.length,
          }),
        });
        if (!response.ok) {
          throw new Error("Failed to update schedule");
        }
        const data = await response.json();
        console.log("Schedule updated:", data);
      }
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        general: error instanceof Error ? error.message : "Failed to schedule activity",
      }));
      console.error("Error saving schedule:", error);
    }
  };

  // ------------------------------------------------------------------------------
  // Handle Allocate: Navigate to Allocate Groups Page if schedule is saved.
  // ------------------------------------------------------------------------------
  const handleAllocate = () => {
    if (!isSaved) return;
    console.log("Navigating to Allocate Groups page...");
    router.push("/host/allocategroups");
  };

  // ------------------------------------------------------------------------------
  // Helper: Parse a Date + "hh:mm am/pm" string into a full Date object.
  // ------------------------------------------------------------------------------
  function parseDateTime(baseDate: Date | undefined, timeString: string): Date | null {
    if (!baseDate) return null;
    const [timePart, ampm] = timeString.split(" ");
    if (!timePart || !ampm) return null;
    const [hourStr, minuteStr] = timePart.split(":");
    if (!hourStr || !minuteStr) return null;
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (isNaN(hour) || isNaN(minute)) return null;
    if (ampm.toLowerCase() === "pm" && hour < 12) {
      hour += 12;
    }
    if (ampm.toLowerCase() === "am" && hour === 12) {
      hour = 0;
    }
    const result = new Date(baseDate);
    result.setHours(hour, minute, 0, 0);
    return result;
  }

  // ------------------------------------------------------------------------------
  // Delete a student from the list.
  // ------------------------------------------------------------------------------
  const handleDeleteStudent = (studentEmail: string) => {
    console.log("Deleting student:", studentEmail);
    setSelectedStudents(prev =>
      prev.filter(student => student.email !== studentEmail)
    );
  };

  // ------------------------------------------------------------------------------
  // Back Button: Navigate back to Activity Created Page.
  // ------------------------------------------------------------------------------
  const handleBack = () => {
    console.log("Navigating back to Activity Created page...");
    router.push("/host/activitycreated");
  };

  return (
    <div className="h-screen flex flex-col items-center bg-[#f9f9f9]">
      {/* Navbar */}
      <div className="w-full max-w-3xl flex items-center justify-between p-4 bg-[#4a3aff] text-white shadow-md">
        <ChevronLeft className="w-6 h-6 cursor-pointer" onClick={handleBack} />
        <h1 className="text-lg font-semibold">Schedule Activity</h1>
        <div className="w-6"></div>
      </div>

      {/* Form Section */}
      <div className="flex-1 overflow-y-auto p-4 w-full max-w-3xl space-y-4">
        {errors.general && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{errors.general}</span>
          </div>
        )}

        {/* Start & End Date Selection */}
        <div className="grid grid-cols-2 gap-4">
          {/* Start Date */}
          <div>
            <label className="text-sm font-bold text-gray-700">Select Start Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !startDate && "text-muted-foreground",
                    errors.startDate ? "border-red-500" : ""
                  )}
                >
                  {startDate ? format(startDate, "PPP") : "Select Start Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
              </PopoverContent>
            </Popover>
            {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
          </div>

          {/* End Date */}
          <div>
            <label className="text-sm font-bold text-gray-700">Select End Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !endDate && "text-muted-foreground",
                    errors.endDate ? "border-red-500" : ""
                  )}
                >
                  {endDate ? format(endDate, "PPP") : "Select End Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
              </PopoverContent>
            </Popover>
            {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
          </div>
        </div>

        {/* Time Selectors */}
        <div>
          <label className="text-sm font-bold text-gray-700">Select Time</label>
          <div className="grid grid-cols-2 gap-4 mt-1">
            {/* Start Time */}
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger>
                <SelectValue placeholder="Start Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9:00 am">9:00 am</SelectItem>
                <SelectItem value="9:30 am">9:30 am</SelectItem>
                <SelectItem value="10:00 am">10:00 am</SelectItem>
                <SelectItem value="10:30 am">10:30 am</SelectItem>
                <SelectItem value="11:00 am">11:00 am</SelectItem>
                <SelectItem value="12:00 pm">12:00 pm</SelectItem>
                <SelectItem value="1:00 pm">1:00 pm</SelectItem>
              </SelectContent>
            </Select>
            {/* End Time */}
            <Select value={endTime} onValueChange={setEndTime}>
              <SelectTrigger>
                <SelectValue placeholder="End Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9:30 am">9:30 am</SelectItem>
                <SelectItem value="10:00 am">10:00 am</SelectItem>
                <SelectItem value="10:30 am">10:30 am</SelectItem>
                <SelectItem value="11:00 am">11:00 am</SelectItem>
                <SelectItem value="11:30 am">11:30 am</SelectItem>
                <SelectItem value="12:00 pm">12:00 pm</SelectItem>
                <SelectItem value="12:30 pm">12:30 pm</SelectItem>
                <SelectItem value="1:00 pm">1:00 pm</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Add Participants Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-gray-700">Add Participants</label>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-2"
                onClick={() => setIsViewingStudents(!isViewingStudents)}
              >
                <Eye className="w-4 h-4 mr-1" />
                <span className="text-xs">{isViewingStudents ? "Hide" : "View"}</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-2"
                onClick={refreshStudentList}
                disabled={isRefreshing}
              >
                <RefreshCcw className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="text-xs">Refresh</span>
              </Button>
            </div>
          </div>
          {/* Batch Dropdown */}
          <div>
            <Select
              value={selectedBatchId}
              onValueChange={(value) => {
                // When a batch is selected, store its _id and find its name.
                setSelectedBatchId(value);
                const selected = batches.find(b => b._id === value);
                setSelectedBatchName(selected ? selected.name : "");
                setIsSaved(false); // Reset saved status if batch changes.
              }}
            >
              <SelectTrigger className={errors.batch ? "border-red-500" : ""}>
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((batch) => (
                  // Use the batch _id as the value and display the batch name.
                  <SelectItem key={batch._id} value={batch._id}>
                    {batch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.batch && <p className="text-red-500 text-xs mt-1">{errors.batch}</p>}
          </div>

          {/* Session Info Display */}
          {sessionInfo && (
            <div className="text-sm text-gray-600">
              Latest Session - Date: {sessionInfo.date}, Time: {sessionInfo.time}
            </div>
          )}

          {/* Student List Display with Delete Option */}
          {isViewingStudents && (
            <Card className="p-3">
              <h3 className="text-sm font-semibold mb-2">
                Selected Students ({selectedStudents.length})
              </h3>
              {selectedStudents.length > 0 ? (
                <div className="max-h-40 overflow-y-auto">
                  <ul className="space-y-1">
                    {selectedStudents.map((student: Student) => (
                      <li key={student._id} className="text-sm p-2 bg-gray-50 rounded flex justify-between items-center">
                        <div>
                          <span className="font-medium">{student.name}</span>
                          <span className="text-gray-500 text-xs ml-1">— {student.email}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                          onClick={() => handleDeleteStudent(student.email)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">No students available</div>
              )}
            </Card>
          )}
        </div>

        {/* Group Type Selection */}
        <div>
          <label className="text-sm font-bold text-gray-700">Group Type</label>
          <Select value={groupType} onValueChange={setGroupType}>
            <SelectTrigger className={`mt-1 ${errors.groupType ? "border-red-500" : ""}`}>
              <SelectValue placeholder="Select group type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WITHIN_GROUP">WITHIN GROUP</SelectItem>
              <SelectItem value="GROUP_TO_GROUP">GROUP to GROUP</SelectItem>
              <SelectItem value="ANY_TO_ANY">ANY to ANY</SelectItem>
            </SelectContent>
          </Select>
          {errors.groupType && <p className="text-red-500 text-xs mt-1">{errors.groupType}</p>}
        </div>

        {/* Group Size Selection */}
        <div>
          <label className="text-sm font-bold text-gray-700">Group Size</label>
          <Select value={groupSize} onValueChange={setGroupSize}>
            <SelectTrigger className={`mt-1 ${errors.groupSize ? "border-red-500" : ""}`}>
              <SelectValue placeholder="Select group size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="6">6</SelectItem>
              <SelectItem value="7">7</SelectItem>
              <SelectItem value="8">8</SelectItem>
              <SelectItem value="9">9</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="11">11</SelectItem>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="13">13</SelectItem>
              <SelectItem value="14">14</SelectItem>
              <SelectItem value="15">15</SelectItem>
            </SelectContent>
          </Select>
          {errors.groupSize && <p className="text-red-500 text-xs mt-1">{errors.groupSize}</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-6">
          {!isSaved ? (
            <Button variant="outline" onClick={handleSave}>
              Save
            </Button>
          ) : (
            <Button variant="outline" onClick={handleSave}>
              Edit
            </Button>
          )}
          <Button className="bg-black text-white hover:bg-gray-800" onClick={handleAllocate} disabled={!isSaved}>
            Allocate Group
          </Button>
        </div>
      </div>
    </div>
  );
}


















































// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Card } from "@/components/ui/card";
// import { ChevronLeft, RefreshCcw, Eye } from "lucide-react";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Calendar } from "@/components/ui/calendar";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import { format } from "date-fns";
// import { cn } from "@/lib/utils";

// // Define interfaces for your data types
// interface Batch {
//   _id: string;
//   name: string;
//   isDisabled?: boolean;
//   createdAt?: string;
//   updatedAt?: string;
//   __v?: number;
// }

// interface Student {
//   _id: string;
//   name: string;
//   email: string;
// }

// export default function ScheduleActivityPage() {
//   const router = useRouter();

//   // Date/time states
//   const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
//   const [startTime, setStartTime] = useState("10:00 am");
//   const [endTime, setEndTime] = useState("10:30 am");

//   // Batches/students
//   const [batches, setBatches] = useState<Batch[]>([]);
//   const [selectedBatch, setSelectedBatch] = useState("");
//   const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);

//   // Scheduling details
//   const [groupType, setGroupType] = useState("");
//   const [groupSize, setGroupSize] = useState("");

//   // View toggles
//   const [isViewingStudents, setIsViewingStudents] = useState(false);
//   const [isSaved, setIsSaved] = useState(false); // Tracks if schedule is saved

//   // Error handling
//   const [errors, setErrors] = useState<{
//     date?: string;
//     batch?: string;
//     groupType?: string;
//     groupSize?: string;
//     general?: string;
//   }>({});

//   // ------------------------------------------------------------------------------
//   // 1. Fetch Batches from the Backend on Component Mount
//   // ------------------------------------------------------------------------------
//   useEffect(() => {
//     const fetchBatches = async () => {
//       try {
//         // Make sure your file is located at pages/api/host/attendence/attendence.ts
//         // and the spelling matches exactly.
//         const response = await fetch("/api/host/attendence/attendence");
//         if (!response.ok) {
//           throw new Error("Failed to fetch batches");
//         }
//         const data = await response.json();
//         if (data.batches) {
//           setBatches(data.batches);
//         }
//       } catch (error) {
//         console.error("Error fetching batches:", error);
//       }
//     };
//     fetchBatches();
//   }, []);

//   // ------------------------------------------------------------------------------
//   // 2. Fetch Present Students for the Selected Batch
//   // ------------------------------------------------------------------------------
//   useEffect(() => {
//     const fetchStudents = async () => {
//       if (!selectedBatch) {
//         setSelectedStudents([]);
//         return;
//       }
//       try {
//         // Must match the same route name
//         const response = await fetch(`/api/host/attendence/attendence?batchId=${selectedBatch}`);
//         if (!response.ok) {
//           throw new Error("Failed to fetch students for batch");
//         }
//         const data = await response.json();
//         // Expecting data with "date" and "students" properties from the API
//         if (data.students) {
//           setSelectedStudents(data.students);
//         } else {
//           setSelectedStudents([]);
//         }
//       } catch (error) {
//         console.error("Error fetching students:", error);
//         setSelectedStudents([]);
//       }
//     };

//     // Only fetch if user changes batch
//     fetchStudents();
//   }, [selectedBatch]);

//   // ------------------------------------------------------------------------------
//   // 3. Refresh Button to Re-fetch Student List for the Selected Batch
//   // ------------------------------------------------------------------------------
//   const refreshStudentList = async () => {
//     if (!selectedBatch) return;
//     try {
//       const response = await fetch(`/api/host/attendence/attendence?batchId=${selectedBatch}`);
//       if (!response.ok) {
//         throw new Error("Failed to refresh student list");
//       }
//       const data = await response.json();
//       if (data.students) {
//         setSelectedStudents(data.students);
//       }
//     } catch (error) {
//       console.error("Error refreshing student list:", error);
//     }
//   };

//   // ------------------------------------------------------------------------------
//   // 4. Handle Save: Combine Date & Time, Validate, and Save
//   // ------------------------------------------------------------------------------
//   const handleSave = async () => {
//     const newErrors: typeof errors = {};
//     let hasErrors = false;

//     // Basic validations
//     if (!selectedDate) {
//       newErrors.date = "Date is required";
//       hasErrors = true;
//     }
//     if (!selectedBatch) {
//       newErrors.batch = "Batch selection is required";
//       hasErrors = true;
//     }
//     if (!groupType) {
//       newErrors.groupType = "Group type is required";
//       hasErrors = true;
//     }
//     if (!groupSize) {
//       newErrors.groupSize = "Group size is required";
//       hasErrors = true;
//     }

//     setErrors(newErrors);
//     if (hasErrors) {
//       return;
//     }

//     // Combine selectedDate + startTime/endTime into Date objects
//     const startDateTime = parseDateTime(selectedDate, startTime);
//     const endDateTime = parseDateTime(selectedDate, endTime);

//     // If either parseDateTime returned null, skip
//     if (!startDateTime || !endDateTime) {
//       setErrors((prev) => ({
//         ...prev,
//         general: "Could not parse start/end times.",
//       }));
//       return;
//     }

//     // For demonstration, let's just log them so TypeScript knows they're used
//     console.log("Scheduling from:", startDateTime, "to:", endDateTime);

//     try {
//       // Example: we store the partial schedule or mark it as saved
//       // so that "Allocate Group" is enabled
//       setIsSaved(true);

//       // If you want to do an API call now, uncomment and adjust:
//       /*
//       const accessToken = localStorage.getItem("accessToken");
//       if (!accessToken) {
//         setErrors((prev) => ({
//           ...prev,
//           general: "Authorization token missing. Please log in again.",
//         }));
//         return;
//       }

//       const response = await fetch("/api/schedule", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${accessToken}`,
//         },
//         body: JSON.stringify({
//           startDateTime,
//           endDateTime,
//           batch: selectedBatch,
//           groupType,
//           groupSize,
//           students: selectedStudents,
//         }),
//       });

//       if (!response.ok) {
//         throw new Error("Failed to schedule activity");
//       }
//       */
//     } catch (error) {
//       setErrors((prev) => ({
//         ...prev,
//         general: error instanceof Error ? error.message : "Failed to schedule activity",
//       }));
//     }
//   };

//   // ------------------------------------------------------------------------------
//   // 5. Handle Allocate: Only Enabled If Already Saved
//   // ------------------------------------------------------------------------------
//   const handleAllocate = () => {
//     if (!isSaved) return;
//     // For example, navigate to the next page
//     router.push("/host/allocategroups");
//   };

//   // ------------------------------------------------------------------------------
//   // 6. Parse a Date + "hh:mm am/pm" String into a Full Date
//   // ------------------------------------------------------------------------------
//   function parseDateTime(baseDate: Date | undefined, timeString: string): Date | null {
//     if (!baseDate) return null;

//     // Example: "10:00 am" -> hour=10, minute=00, am/pm
//     const [timePart, ampm] = timeString.split(" ");
//     if (!timePart || !ampm) return null;

//     const [hourStr, minuteStr] = timePart.split(":");
//     if (!hourStr || !minuteStr) return null;

//     let hour = parseInt(hourStr, 10);
//     const minute = parseInt(minuteStr, 10);
//     if (isNaN(hour) || isNaN(minute)) return null;

//     // Convert to 24-hour
//     if (ampm.toLowerCase() === "pm" && hour < 12) {
//       hour += 12;
//     }
//     if (ampm.toLowerCase() === "am" && hour === 12) {
//       hour = 0;
//     }

//     // Clone baseDate to avoid mutating state
//     const result = new Date(baseDate);
//     result.setHours(hour, minute, 0, 0);
//     return result;
//   }

//   // ------------------------------------------------------------------------------
//   // RENDER
//   // ------------------------------------------------------------------------------
//   return (
//     <div className="h-screen flex flex-col items-center bg-[#f9f9f9]">
//       {/* Navbar */}
//       <div className="w-full max-w-3xl flex items-center justify-between p-4 bg-[#4a3aff] text-white shadow-md">
//         <ChevronLeft className="w-6 h-6 cursor-pointer" onClick={() => router.back()} />
//         <h1 className="text-lg font-semibold">Schedule Activity</h1>
//         <div className="w-6"></div>
//       </div>

//       {/* Form Section */}
//       <div className="flex-1 overflow-y-auto p-4 w-full max-w-3xl space-y-4">
//         {errors.general && (
//           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
//             <span className="block sm:inline">{errors.general}</span>
//           </div>
//         )}

//         {/* Date Selection */}
//         <div>
//           <label className="text-sm font-bold text-gray-700">Select Date</label>
//           <Popover>
//             <PopoverTrigger asChild>
//               <Button
//                 variant="outline"
//                 className={cn(
//                   "w-full justify-start text-left font-normal mt-1",
//                   !selectedDate && "text-muted-foreground",
//                   errors.date ? "border-red-500" : ""
//                 )}
//               >
//                 {selectedDate ? format(selectedDate, "PPP") : "Select Date"}
//               </Button>
//             </PopoverTrigger>
//             <PopoverContent className="w-auto p-0">
//               <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
//             </PopoverContent>
//           </Popover>
//           {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
//         </div>

//         {/* Time Selection */}
//         <div>
//           <label className="text-sm font-bold text-gray-700">Select Time</label>
//           <div className="grid grid-cols-2 gap-4 mt-1">
//             {/* Start Time */}
//             <Select value={startTime} onValueChange={setStartTime}>
//               <SelectTrigger>
//                 <SelectValue placeholder="Start Time" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="9:00 am">9:00 am</SelectItem>
//                 <SelectItem value="9:30 am">9:30 am</SelectItem>
//                 <SelectItem value="10:00 am">10:00 am</SelectItem>
//                 <SelectItem value="10:30 am">10:30 am</SelectItem>
//                 <SelectItem value="11:00 am">11:00 am</SelectItem>
//                 <SelectItem value="12:00 pm">12:00 pm</SelectItem>
//                 <SelectItem value="1:00 pm">1:00 pm</SelectItem>
//               </SelectContent>
//             </Select>

//             {/* End Time */}
//             <Select value={endTime} onValueChange={setEndTime}>
//               <SelectTrigger>
//                 <SelectValue placeholder="End Time" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="9:30 am">9:30 am</SelectItem>
//                 <SelectItem value="10:00 am">10:00 am</SelectItem>
//                 <SelectItem value="10:30 am">10:30 am</SelectItem>
//                 <SelectItem value="11:00 am">11:00 am</SelectItem>
//                 <SelectItem value="11:30 am">11:30 am</SelectItem>
//                 <SelectItem value="12:00 pm">12:00 pm</SelectItem>
//                 <SelectItem value="12:30 pm">12:30 pm</SelectItem>
//                 <SelectItem value="1:00 pm">1:00 pm</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>
//         </div>

//         {/* Add Participants */}
//         <div>
//           <div className="flex justify-between items-center">
//             <label className="text-sm font-bold text-gray-700">Add Participants</label>
//             <div className="flex space-x-2">
//               <Button variant="outline" size="icon" onClick={() => setIsViewingStudents(!isViewingStudents)}>
//                 <Eye className="w-4 h-4" />
//               </Button>
//               <Button variant="outline" size="icon" onClick={refreshStudentList}>
//                 <RefreshCcw className="w-4 h-4" />
//               </Button>
//             </div>
//           </div>
//           <div className="mt-1">
//             <Select
//               value={selectedBatch}
//               onValueChange={(value) => {
//                 setSelectedBatch(value);
//                 setIsSaved(false); // If user changes batch, unsave
//               }}
//             >
//               <SelectTrigger className={errors.batch ? "border-red-500" : ""}>
//                 <SelectValue placeholder="Select batch" />
//               </SelectTrigger>
//               <SelectContent>
//                 {batches.map((batch) => (
//                   <SelectItem key={batch._id} value={batch._id}>
//                     {batch.name}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//             {errors.batch && <p className="text-red-500 text-xs mt-1">{errors.batch}</p>}
//           </div>

//           {/* Student list display */}
//           {isViewingStudents && selectedStudents.length > 0 && (
//             <Card className="mt-2 p-3">
//               <h3 className="text-sm font-semibold mb-2">
//                 Selected Students ({selectedStudents.length})
//               </h3>
//               <div className="max-h-40 overflow-y-auto">
//                 <ul className="space-y-1">
//                   {selectedStudents.map((student: Student) => (
//                     <li key={student._id} className="text-sm p-1 bg-gray-50 rounded">
//                       {student.name} — {student.email}
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             </Card>
//           )}
//         </div>

//         {/* Group Type */}
//         <div>
//           <label className="text-sm font-bold text-gray-700">Group Type</label>
//           <Select value={groupType} onValueChange={setGroupType}>
//             <SelectTrigger className={`mt-1 ${errors.groupType ? "border-red-500" : ""}`}>
//               <SelectValue placeholder="Select group type" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="WITHIN_GROUP">WITHIN GROUP</SelectItem>
//               <SelectItem value="GROUP_TO_GROUP">GROUP to GROUP</SelectItem>
//               <SelectItem value="ANY_TO_ANY">ANY to ANY</SelectItem>
//             </SelectContent>
//           </Select>
//           {errors.groupType && <p className="text-red-500 text-xs mt-1">{errors.groupType}</p>}
//         </div>

//         {/* Group Size */}
//         <div>
//           <label className="text-sm font-bold text-gray-700">Group Size</label>
//           <Select value={groupSize} onValueChange={setGroupSize}>
//             <SelectTrigger className={`mt-1 ${errors.groupSize ? "border-red-500" : ""}`}>
//               <SelectValue placeholder="Select group size" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="2">2</SelectItem>
//               <SelectItem value="3">3</SelectItem>
//               <SelectItem value="4">4</SelectItem>
//               <SelectItem value="5">5</SelectItem>
//               <SelectItem value="6">6</SelectItem>
//               <SelectItem value="7">7</SelectItem>
//               <SelectItem value="8">8</SelectItem>
//               <SelectItem value="9">9</SelectItem>
//               <SelectItem value="10">10</SelectItem>
//               <SelectItem value="11">11</SelectItem>
//               <SelectItem value="12">12</SelectItem>
//               <SelectItem value="13">13</SelectItem>
//               <SelectItem value="14">14</SelectItem>
//               <SelectItem value="15">15</SelectItem>
//             </SelectContent>
//           </Select>
//           {errors.groupSize && <p className="text-red-500 text-xs mt-1">{errors.groupSize}</p>}
//         </div>

//         {/* Action Buttons */}
//         <div className="flex justify-between mt-6">
//           {!isSaved ? (
//             <Button variant="outline" onClick={handleSave}>
//               Save
//             </Button>
//           ) : (
//             <Button variant="outline" onClick={() => setIsSaved(false)}>
//               Edit
//             </Button>
//           )}
//           <Button className="bg-black text-white hover:bg-gray-800" onClick={handleAllocate} disabled={!isSaved}>
//             Allocate Group
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// }
