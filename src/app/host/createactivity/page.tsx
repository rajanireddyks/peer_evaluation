//src/app/host/createactivity/page.tsx

// src/app/host/createactivity/page.tsx

"use client";

import { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, PlusCircle, Star, XCircle, Trash } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Type Definitions ---
interface Criterion {
  id: number;
  name: string;
  rating: string;
  maxMarks: string;
}

interface CriterionError {
  name?: string;
  rating?: string;
  maxMarks?: string;
}

interface FormErrors {
  activityName?: string;
  criteria: Record<number, CriterionError>;
  general?: string;
}

export default function CreateActivityPage() {
  const router = useRouter();

  // ---------------- State ----------------
  const [activityName, setActivityName] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>([
    { id: 1, name: "", rating: "", maxMarks: "" },
  ]);
  const [errors, setErrors] = useState<FormErrors>({ criteria: {} });
  const [isSaved, setIsSaved] = useState(false); // true if activity is created
  const [editMode, setEditMode] = useState(true); // controls whether the form is editable
  const [activityId, setActivityId] = useState<number | null>(null);

  // ---------------- 2-second Polling ----------------
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    // Only start polling if we have an activityId
    if (activityId) {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const fetchActivity = async () => {
        try {
          // We're just pinging the API but not storing the response
          await axios.get(`/api/createactivity?activityId=${activityId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (err: unknown) {
          if (err instanceof AxiosError) {
            console.error("Polling error (Axios):", err.message);
          } else {
            console.error("Polling error (Unknown):", err);
          }
        }
      };

      // Fetch immediately, then poll every 2 seconds
      fetchActivity();
      intervalId = setInterval(fetchActivity, 2000);
    }

    // Cleanup
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activityId]);

  // ---------------- Handlers ----------------

  // Validation for each criterion
  const validateCriterion = (criterion: Criterion): CriterionError => {
    const critErrors: CriterionError = {};
    if (!criterion.name.trim()) critErrors.name = "Criteria name is required";
    if (!criterion.rating) critErrors.rating = "Rating type is required";
    if (!criterion.maxMarks) critErrors.maxMarks = "Max marks is required";
    return critErrors;
  };

  // Add a new criterion
  const addCriteria = () => {
    setCriteria([
      ...criteria,
      { id: criteria.length + 1, name: "", rating: "", maxMarks: "" },
    ]);
  };

  // Remove a criterion
  const removeCriteria = (id: number) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter((item) => item.id !== id));
      const newErrors = { ...errors };
      delete newErrors.criteria[id];
      setErrors(newErrors);
    }
  };

  // Main save/update handler
  const handleSave = async () => {
    // Validate inputs
    const newErrors: FormErrors = { criteria: {} };
    let hasErrors = false;

    if (!activityName.trim()) {
      newErrors.activityName = "Activity name is required";
      hasErrors = true;
    }

    criteria.forEach((c) => {
      const critErrors = validateCriterion(c);
      if (Object.keys(critErrors).length > 0) {
        newErrors.criteria[c.id] = critErrors;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    if (hasErrors) return;

    // Prepare rubric data
    const rubricCriteria = criteria.map((c) => ({
      name: c.name,
      rating: c.rating,
    }));
    const maxMarks: Record<string, number> = {};
    criteria.forEach((c) => {
      maxMarks[c.name] = Number(c.maxMarks);
    });

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setErrors((prev) => ({
          ...prev,
          general: "Authorization token missing. Please log in again.",
        }));
        return;
      }

      if (!isSaved) {
        // First time save (POST)
        const response = await axios.post(
          "/api/createactivity",
          {
            activityName,
            createdWithRole: "HOST",
            metadata: {},
            rubricCriteria,
            maxMarks,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Set the activityId from the response
        setActivityId(response.data.id);
        setIsSaved(true);
        setEditMode(false); // Switch to read-only mode
      } else {
        // Update (PATCH)
        if (!activityId) return;
        await axios.patch(
          "/api/createactivity",
          {
            id: activityId,
            activityName,
            metadata: {},
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEditMode(false); // Switch to read-only mode
      }
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setErrors((prev) => ({
          ...prev,
          general: err.response?.data?.error || "Failed to save or update activity",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          general: "Failed to save or update activity",
        }));
      }
      console.error("Error saving/updating activity:", err);
    }
  };

  // Handle Edit button click: toggle back to edit mode
  const handleEdit = () => {
    setEditMode(true);
  };

  // Navigate to schedule page with the activityId as a query parameter.
  const handleSchedule = () => {
    if (activityId) {
      // Append activityId to the URL query
      router.push(`/host/schedule?activityId=${activityId}`);
    } else {
      console.error("Activity ID is missing. Cannot navigate to schedule.");
    }
  };

  // ---------------- Render ----------------
  return (
    <div className="h-screen flex flex-col items-center bg-[#f9f9f9]">
      {/* Navbar */}
      <div className="w-full max-w-3xl flex items-center justify-between p-4 bg-[#4a3aff] text-white shadow-md">
        <ChevronLeft className="w-6 h-6 cursor-pointer" onClick={() => router.back()} />
        <h1 className="text-lg font-semibold">Create Activity</h1>
        <div className="w-6" />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 w-full max-w-3xl space-y-4">
        {errors.general && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
            <span>{errors.general}</span>
          </div>
        )}

        {/* Activity Name */}
        {editMode ? (
          <div>
            <label className="text-sm font-bold text-gray-700">Activity Name *</label>
            <Input
              placeholder="Type activity name"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              className={errors.activityName ? "border-red-500" : ""}
            />
            {errors.activityName && (
              <p className="text-red-500 text-xs mt-1">{errors.activityName}</p>
            )}
          </div>
        ) : (
          <div>
            <p className="font-bold text-gray-700">Activity Name</p>
            <p>{activityName}</p>
          </div>
        )}

        {/* Criteria Section */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">Criteria</span>
          {editMode && (
            <Button variant="outline" size="icon" onClick={addCriteria}>
              <PlusCircle className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Criteria List */}
        {criteria.map((item, index) => (
          <Card key={item.id} className="p-4 border border-gray-300 space-y-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-500">
                Criteria {index + 1}
              </span>
            </div>

            {editMode ? (
              <>
                <Input
                  placeholder="Type criteria name..."
                  value={item.name}
                  onChange={(e) => {
                    const updated = [...criteria];
                    updated[index].name = e.target.value;
                    setCriteria(updated);
                  }}
                  className={errors.criteria[item.id]?.name ? "border-red-500" : ""}
                />
                {errors.criteria[item.id]?.name && (
                  <p className="text-red-500 text-xs">{errors.criteria[item.id]?.name}</p>
                )}

                <Select
                  value={item.rating}
                  onValueChange={(value) => {
                    const updated = [...criteria];
                    updated[index].rating = value;
                    setCriteria(updated);
                  }}
                >
                  <SelectTrigger className={errors.criteria[item.id]?.rating ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select rating type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
                {errors.criteria[item.id]?.rating && (
                  <p className="text-red-500 text-xs">{errors.criteria[item.id]?.rating}</p>
                )}

                <Select
                  value={item.maxMarks}
                  onValueChange={(value) => {
                    const updated = [...criteria];
                    updated[index].maxMarks = value;
                    setCriteria(updated);
                  }}
                >
                  <SelectTrigger className={errors.criteria[item.id]?.maxMarks ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select max marks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
                {errors.criteria[item.id]?.maxMarks && (
                  <p className="text-red-500 text-xs">{errors.criteria[item.id]?.maxMarks}</p>
                )}
              </>
            ) : (
              <>
                <p>
                  <strong>Name:</strong> {item.name}
                </p>
                <p>
                  <strong>Rating Type:</strong> {item.rating}
                </p>
                <p>
                  <strong>Max Marks:</strong> {item.maxMarks}
                </p>
              </>
            )}

            {item.rating === "rating" && (
              <div className="flex justify-center space-x-2 mt-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <Star
                    key={num}
                    className={`w-6 h-6 ${
                      num <= parseInt(item.maxMarks || "5") ? "text-yellow-400" : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
            )}

            {editMode && (
              <div className="flex justify-end space-x-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const updated = [...criteria];
                    updated[index] = { id: item.id, name: "", rating: "", maxMarks: "" };
                    setCriteria(updated);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Clear
                </Button>
                {criteria.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-red-500 hover:text-white"
                    onClick={() => removeCriteria(item.id)}
                  >
                    <Trash className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </Card>
        ))}

        {/* Bottom Buttons */}
        <div className="flex justify-between mt-6">
          {!isSaved ? (
            <Button variant="outline" onClick={handleSave}>
              Save
            </Button>
          ) : editMode ? (
            <Button variant="outline" onClick={handleSave}>
              Save Changes
            </Button>
          ) : (
            <Button variant="outline" onClick={handleEdit}>
              Edit
            </Button>
          )}

          {/* Navigate to Schedule Page with activityId as query */}
          <Button
            onClick={handleSchedule}
            disabled={!isSaved}
            className="bg-black text-white hover:bg-gray-800"
          >
            Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}








































// "use client";

// import { useEffect, useState } from "react";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Card } from "@/components/ui/card";
// import { Skeleton } from "@/components/ui/skeleton";
// import { ChevronLeft, PlusCircle, Star, XCircle, Trash } from "lucide-react";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// // --- Type Definitions for Form Data & Errors ---
// interface Criterion {
//   id: number;
//   name: string;
//   rating: string;
//   maxMarks: string;
// }

// interface CriterionError {
//   name?: string;
//   rating?: string;
//   maxMarks?: string;
// }

// interface FormErrors {
//   activityName?: string;
//   criteria: Record<number, CriterionError>;
//   general?: string;
// }

// // --- Define the shape of ActivityData returned from GET API ---
// interface ActivityData {
//   id: number;
//   activityName: string;
//   createdWithRole: string;
//   metadata: Record<string, unknown>;
// }

// export default function CreateActivityPage() {
//   const router = useRouter();

//   // Form state
//   const [activityName, setActivityName] = useState("");
//   const [criteria, setCriteria] = useState<Criterion[]>([
//     { id: 1, name: "", rating: "", maxMarks: "" },
//   ]);
//   const [errors, setErrors] = useState<FormErrors>({ criteria: {} });
//   const [isSaved, setIsSaved] = useState(false);
//   const [activityId, setActivityId] = useState<string | null>(null);

//   // Polling state: for fetching the created activity details every 2 seconds
//   const [isLoading, setIsLoading] = useState(false);
//   const [activityData, setActivityData] = useState<ActivityData | null>(null);

//   // --- Polling Effect: When an activity is created, poll the API every 2 seconds ---
//   useEffect(() => {
//     let interval: NodeJS.Timeout;
//     if (activityId) {
//       const fetchActivity = async () => {
//         try {
//           const token = localStorage.getItem("accessToken");
//           if (!token) return;
//           // Note: The GET endpoint is /api/createactivity?activityId=...
//           const res = await axios.get(`/api/createactivity?activityId=${activityId}`, {
//             headers: { Authorization: `Bearer ${token}` },
//           });
//           setActivityData(res.data);
//           setIsLoading(false);
//         } catch (error: unknown) {
//           console.error("Polling error:", error);
//         }
//       };

//       // Immediately fetch activity data and then poll every 2 seconds
//       fetchActivity();
//       interval = setInterval(fetchActivity, 2000);
//     }
//     return () => {
//       if (interval) clearInterval(interval);
//     };
//   }, [activityId]);

//   // --- Validation: Check each criterion ---
//   const validateCriterion = (criterion: Criterion): CriterionError => {
//     const critErrors: CriterionError = {};
//     if (!criterion.name.trim()) critErrors.name = "Criteria name is required";
//     if (!criterion.rating) critErrors.rating = "Rating type is required";
//     if (!criterion.maxMarks) critErrors.maxMarks = "Max marks is required";
//     return critErrors;
//   };

//   // --- Handler: Add a new criterion ---
//   const addCriteria = () => {
//     setCriteria([...criteria, { id: criteria.length + 1, name: "", rating: "", maxMarks: "" }]);
//   };

//   // --- Handler: Remove a criterion ---
//   const removeCriteria = (id: number) => {
//     if (criteria.length > 1) {
//       setCriteria(criteria.filter((item) => item.id !== id));
//       const newErrors = { ...errors };
//       delete newErrors.criteria[id];
//       setErrors(newErrors);
//     }
//   };

//   // --- Handler: Save the Activity ---
//   const handleSave = async () => {
//     const newErrors: FormErrors = { criteria: {} };
//     let hasErrors = false;
//     if (!activityName.trim()) {
//       newErrors.activityName = "Activity name is required";
//       hasErrors = true;
//     }
//     criteria.forEach((c) => {
//       const critErrors = validateCriterion(c);
//       if (Object.keys(critErrors).length > 0) {
//         newErrors.criteria[c.id] = critErrors;
//         hasErrors = true;
//       }
//     });
//     setErrors(newErrors);
//     if (hasErrors) return;

//     try {
//       const token = localStorage.getItem("accessToken");
//       if (!token) {
//         setErrors((prev) => ({ ...prev, general: "Authorization token missing. Please log in again." }));
//         return;
//       }
//       // Build rubric data:
//       // - rubricCriteria: an array of objects with name and rating.
//       // - maxMarks: an object mapping each criterion name to its numeric max marks.
//       const rubricCriteria = criteria.map((c) => ({
//         name: c.name,
//         rating: c.rating,
//       }));
//       const maxMarks: Record<string, number> = {};
//       criteria.forEach((c) => {
//         maxMarks[c.name] = Number(c.maxMarks);
//       });

//       const response = await axios.post(
//         "/api/createactivity",
//         {
//           activityName,
//           createdWithRole: "HOST", // This page is for hosts.
//           metadata: {}, // No default description provided.
//           rubricCriteria,
//           maxMarks,
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       // Assuming the response returns the created activity with an "id"
//       setActivityId(response.data.id?.toString() || null);
//       setIsSaved(true);
//     } catch (error: unknown) {
//       let message = "Failed to save activity";
//       if (error instanceof Error) message = error.message;
//       setErrors((prev) => ({ ...prev, general: message }));
//     }
//   };

//   // --- Handler: Navigate to the schedule page ---
//   const handleSchedule = () => {
//     if (activityId) {
//       router.push(`/host/scheduleactivity?id=${activityId}`);
//     } else {
//       router.push("/host/scheduleactivity");
//     }
//   };

//   return (
//     <div className="h-screen flex flex-col items-center bg-[#f9f9f9]">
//       {/* Navbar */}
//       <div className="w-full max-w-3xl flex items-center justify-between p-4 bg-[#4a3aff] text-white shadow-md">
//         <ChevronLeft className="w-6 h-6 cursor-pointer" onClick={() => router.back()} />
//         <h1 className="text-lg font-semibold">Create Activity</h1>
//         <div className="w-6" />
//       </div>

//       {/* Main Content */}
//       <div className="flex-1 overflow-y-auto px-4 py-4 w-full max-w-3xl space-y-4">
//         {errors.general && (
//           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
//             <span>{errors.general}</span>
//           </div>
//         )}

//         {/* Activity Name Input */}
//         <div>
//           <label className="text-sm font-bold text-gray-700">Activity Name *</label>
//           <Input
//             placeholder="Type activity name"
//             value={activityName}
//             onChange={(e) => setActivityName(e.target.value)}
//             className={errors.activityName ? "border-red-500" : ""}
//           />
//           {errors.activityName && <p className="text-red-500 text-xs mt-1">{errors.activityName}</p>}
//         </div>

//         {/* Criteria Section Header */}
//         <div className="flex items-center justify-between">
//           <span className="text-sm font-bold text-gray-700">Add Criteria</span>
//           <Button variant="outline" size="icon" onClick={addCriteria}>
//             <PlusCircle className="w-5 h-5" />
//           </Button>
//         </div>

//         {/* Dynamic Criteria Fields */}
//         {criteria.map((item, index) => (
//           <Card key={item.id} className="p-4 border border-gray-300 space-y-2">
//             <div className="flex justify-between items-center mb-2">
//               <span className="text-sm font-medium text-gray-500">Criteria {index + 1}</span>
//             </div>
//             <Input
//               placeholder="Type criteria name..."
//               value={item.name}
//               onChange={(e) => {
//                 const updated = [...criteria];
//                 updated[index].name = e.target.value;
//                 setCriteria(updated);
//               }}
//               className={errors.criteria[item.id]?.name ? "border-red-500" : ""}
//             />
//             {errors.criteria[item.id]?.name && (
//               <p className="text-red-500 text-xs">{errors.criteria[item.id]?.name}</p>
//             )}
//             <Select
//               value={item.rating}
//               onValueChange={(value) => {
//                 const updated = [...criteria];
//                 updated[index].rating = value;
//                 setCriteria(updated);
//               }}
//             >
//               <SelectTrigger className={errors.criteria[item.id]?.rating ? "border-red-500" : ""}>
//                 <SelectValue placeholder="Select rating type" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="rating">Rating</SelectItem>
//                 <SelectItem value="text">Text</SelectItem>
//               </SelectContent>
//             </Select>
//             {errors.criteria[item.id]?.rating && (
//               <p className="text-red-500 text-xs">{errors.criteria[item.id]?.rating}</p>
//             )}
//             <Select
//               value={item.maxMarks}
//               onValueChange={(value) => {
//                 const updated = [...criteria];
//                 updated[index].maxMarks = value;
//                 setCriteria(updated);
//               }}
//             >
//               <SelectTrigger className={errors.criteria[item.id]?.maxMarks ? "border-red-500" : ""}>
//                 <SelectValue placeholder="Select max marks" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="5">5</SelectItem>
//                 <SelectItem value="10">10</SelectItem>
//                 <SelectItem value="15">15</SelectItem>
//                 <SelectItem value="20">20</SelectItem>
//               </SelectContent>
//             </Select>
//             {errors.criteria[item.id]?.maxMarks && (
//               <p className="text-red-500 text-xs">{errors.criteria[item.id]?.maxMarks}</p>
//             )}
//             {item.rating === "rating" && (
//               <div className="flex justify-center space-x-2 mt-2">
//                 {[1, 2, 3, 4, 5].map((num) => (
//                   <Star
//                     key={num}
//                     className={`w-6 h-6 ${num <= parseInt(item.maxMarks || "5") ? "text-yellow-400" : "text-gray-300"}`}
//                   />
//                 ))}
//               </div>
//             )}
//             <div className="flex justify-end space-x-2 mt-2">
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => {
//                   const updated = [...criteria];
//                   updated[index] = { id: item.id, name: "", rating: "", maxMarks: "" };
//                   setCriteria(updated);
//                 }}
//               >
//                 <XCircle className="w-4 h-4 mr-1" /> Cancel
//               </Button>
//               {criteria.length > 1 && (
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   className="hover:bg-red-500 hover:text-white"
//                   onClick={() => removeCriteria(item.id)}
//                 >
//                   <Trash className="w-4 h-4 mr-1" /> Delete
//                 </Button>
//               )}
//             </div>
//           </Card>
//         ))}

//         <div className="flex justify-between mt-6">
//           <Button variant="outline" onClick={handleSave}>
//             Save
//           </Button>
//           <Button onClick={handleSchedule} disabled={!isSaved} className="bg-black text-white hover:bg-gray-800">
//             Schedule
//           </Button>
//         </div>

//         {/* Skeleton Loader displayed during polling */}
//         {isLoading && (
//           <div className="mt-4 space-y-2">
//             <Skeleton className="h-10 w-full" />
//             <Skeleton className="h-10 w-full" />
//             <Skeleton className="h-10 w-full" />
//           </div>
//         )}

//         {/* Display Fetched Activity Data */}
//         {activityData && (
//           <div className="mt-4 p-4 border rounded-md">
//             <h2 className="text-lg font-semibold mb-2">Activity Details</h2>
//             <p>ID: {activityData.id}</p>
//             <p>Name: {activityData.activityName}</p>
//             <p>Created With Role: {activityData.createdWithRole}</p>
//             {/* Render additional details as needed */}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


































// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card } from "@/components/ui/card";
// import { ChevronLeft, PlusCircle, Star, XCircle, Trash } from "lucide-react";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// // --- Define interfaces for type safety ---
// interface Criterion {
//   id: number;
//   name: string;
//   rating: string;
//   maxMarks: string;
// }

// interface CriterionError {
//   name?: string;
//   rating?: string;
//   maxMarks?: string;
// }

// interface FormErrors {
//   activityName?: string;
//   criteria: Record<number, CriterionError>;
//   general?: string;
// }

// export default function CreateActivityPage() {
//   const router = useRouter();

//   // Component state
//   const [activityName, setActivityName] = useState("");
//   const [criteria, setCriteria] = useState<Criterion[]>([
//     { id: 1, name: "", rating: "", maxMarks: "" },
//   ]);
//   const [errors, setErrors] = useState<FormErrors>({ criteria: {} });
//   const [isSaved, setIsSaved] = useState(false);
//   const [activityId, setActivityId] = useState<string | null>(null);

//   // Add a new criterion field
//   const addCriteria = () => {
//     setCriteria([...criteria, { id: criteria.length + 1, name: "", rating: "", maxMarks: "" }]);
//   };

//   // Remove a criterion (if more than one exists)
//   const removeCriteria = (id: number) => {
//     if (criteria.length > 1) {
//       setCriteria(criteria.filter((item) => item.id !== id));
//       const newErrors = { ...errors };
//       delete newErrors.criteria[id];
//       setErrors(newErrors);
//     }
//   };

//   // Validate one criterion; returns a CriterionError object
//   const validateCriterion = (criterion: Criterion): CriterionError => {
//     const critErrors: CriterionError = {};
//     if (!criterion.name.trim()) {
//       critErrors.name = "Criteria name is required";
//     }
//     if (!criterion.rating) {
//       critErrors.rating = "Rating type is required";
//     }
//     if (!criterion.maxMarks) {
//       critErrors.maxMarks = "Max marks is required";
//     }
//     return critErrors;
//   };

//   // Save the activity
//   const handleSave = async () => {
//     const newErrors: FormErrors = { criteria: {} };
//     let hasErrors = false;

//     // Validate the activity name
//     if (!activityName.trim()) {
//       newErrors.activityName = "Activity name is required";
//       hasErrors = true;
//     }

//     // Validate each criterion and store any errors
//     criteria.forEach((item) => {
//       const critErrors = validateCriterion(item);
//       if (Object.keys(critErrors).length > 0) {
//         newErrors.criteria[item.id] = critErrors;
//         hasErrors = true;
//       }
//     });

//     setErrors(newErrors);
//     if (hasErrors) return;

//     try {
//       const accessToken = localStorage.getItem("accessToken");
//       if (!accessToken) {
//         setErrors((prev) => ({
//           ...prev,
//           general: "Authorization token missing. Please log in again.",
//         }));
//         return;
//       }

//       // Prepare rubric data:
//       // rubricCriteria is an array of objects each with name and rating.
//       // maxMarks is an object mapping criterion name to its numeric max marks.
//       const rubricCriteria = criteria.map((c) => ({
//         name: c.name,
//         rating: c.rating,
//       }));
//       const maxMarks: Record<string, number> = {};
//       criteria.forEach((c) => {
//         maxMarks[c.name] = Number(c.maxMarks);
//       });

//       const response = await fetch("/api/createactivity", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${accessToken}`,
//         },
//         body: JSON.stringify({
//           activityName,
//           createdWithRole: "HOST", // This page is for hosts; you can also read from localStorage if needed.
//           metadata: {
//             description: "Evaluation of group project submissions",
//           },
//           rubricCriteria,
//           maxMarks,
//         }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.error || "Failed to save activity");
//       }

//       const data = await response.json();
//       // Assuming the response contains the activity id as "id"
//       setActivityId(data.id?.toString() || null);
//       setIsSaved(true);
//     } catch (error) {
//       setErrors((prev) => ({
//         ...prev,
//         general: error instanceof Error ? error.message : "Failed to save activity",
//       }));
//     }
//   };

//   // Navigate to the schedule page
//   const handleSchedule = () => {
//     if (activityId) {
//       router.push(`/host/scheduleactivity?id=${activityId}`);
//     } else {
//       router.push("/host/scheduleactivity");
//     }
//   };

//   return (
//     <div className="h-screen flex flex-col items-center bg-[#f9f9f9]">
//       {/* Navbar */}
//       <div className="w-full max-w-3xl flex items-center justify-between p-4 bg-[#4a3aff] text-white shadow-md">
//         <ChevronLeft className="w-6 h-6 cursor-pointer" onClick={() => router.back()} />
//         <h1 className="text-lg font-semibold">Create Activity</h1>
//         <div className="w-6"></div>
//       </div>

//       {/* Form Section */}
//       <div className="flex-1 overflow-y-auto p-4 w-full max-w-3xl space-y-4">
//         {errors.general && (
//           <div
//             className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
//             role="alert"
//           >
//             <span className="block sm:inline">{errors.general}</span>
//           </div>
//         )}

//         {/* Activity Name */}
//         <div>
//           <label className="text-sm font-bold text-gray-700">Activity Name *</label>
//           <Input
//             placeholder="Type activity name"
//             className={`mt-1 ${errors.activityName ? "border-red-500" : ""}`}
//             value={activityName}
//             onChange={(e) => setActivityName(e.target.value)}
//           />
//           {errors.activityName && (
//             <p className="text-red-500 text-xs mt-1">{errors.activityName}</p>
//           )}
//         </div>

//         {/* Add Criteria Section */}
//         <div className="space-y-4">
//           <div className="flex items-center justify-between">
//             <span className="text-sm font-bold text-gray-700">Add Criteria</span>
//             <Button variant="outline" size="icon" onClick={addCriteria}>
//               <PlusCircle className="w-5 h-5" />
//             </Button>
//           </div>

//           {criteria.map((item, index) => (
//             <Card key={item.id} className="p-4 space-y-2 border border-gray-300">
//               <div className="flex justify-between items-center mb-2">
//                 <span className="text-sm font-medium text-gray-500">Criteria {index + 1}</span>
//               </div>

//               <Input
//                 placeholder="Type criteria name..."
//                 value={item.name}
//                 className={errors.criteria[item.id]?.name ? "border-red-500" : ""}
//                 onChange={(e) => {
//                   const updated = [...criteria];
//                   updated[index].name = e.target.value;
//                   setCriteria(updated);
//                 }}
//               />
//               {errors.criteria[item.id]?.name && (
//                 <p className="text-red-500 text-xs">{errors.criteria[item.id]?.name}</p>
//               )}

//               <Select
//                 value={item.rating}
//                 onValueChange={(value) => {
//                   const updated = [...criteria];
//                   updated[index].rating = value;
//                   setCriteria(updated);
//                 }}
//               >
//                 <SelectTrigger className={`w-full ${errors.criteria[item.id]?.rating ? "border-red-500" : ""}`}>
//                   <SelectValue placeholder="Select rating type" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="rating">Rating</SelectItem>
//                   <SelectItem value="text">Text</SelectItem>
//                 </SelectContent>
//               </Select>
//               {errors.criteria[item.id]?.rating && (
//                 <p className="text-red-500 text-xs">{errors.criteria[item.id]?.rating}</p>
//               )}

//               <Select
//                 value={item.maxMarks}
//                 onValueChange={(value) => {
//                   const updated = [...criteria];
//                   updated[index].maxMarks = value;
//                   setCriteria(updated);
//                 }}
//               >
//                 <SelectTrigger className={`w-full ${errors.criteria[item.id]?.maxMarks ? "border-red-500" : ""}`}>
//                   <SelectValue placeholder="Select max marks" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="5">5</SelectItem>
//                   <SelectItem value="10">10</SelectItem>
//                   <SelectItem value="15">15</SelectItem>
//                   <SelectItem value="20">20</SelectItem>
//                 </SelectContent>
//               </Select>
//               {errors.criteria[item.id]?.maxMarks && (
//                 <p className="text-red-500 text-xs">{errors.criteria[item.id]?.maxMarks}</p>
//               )}

//               {item.rating === "rating" && (
//                 <div className="flex justify-center space-x-2 mt-2">
//                   {[1, 2, 3, 4, 5].map((num) => (
//                     <Star
//                       key={num}
//                       className={`w-6 h-6 ${
//                         num <= parseInt(item.maxMarks || "5") ? "text-yellow-400" : "text-gray-300"
//                       }`}
//                     />
//                   ))}
//                 </div>
//               )}

//               <div className="flex justify-end space-x-2 mt-2">
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={() => {
//                     const updated = [...criteria];
//                     updated[index] = { id: item.id, name: "", rating: "", maxMarks: "" };
//                     setCriteria(updated);
//                   }}
//                 >
//                   <XCircle className="w-4 h-4 mr-1" /> Cancel
//                 </Button>
//                 {criteria.length > 1 && (
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     className="hover:bg-red-500 hover:text-white"
//                     onClick={() => removeCriteria(item.id)}
//                   >
//                     <Trash className="w-4 h-4 mr-1" /> Delete
//                   </Button>
//                 )}
//               </div>
//             </Card>
//           ))}
//         </div>

//         <div className="flex justify-between mt-6">
//           <Button variant="outline" onClick={handleSave}>Save</Button>
//           <Button onClick={handleSchedule} disabled={!isSaved} className="bg-black text-white hover:bg-gray-800">
//             Schedule
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// }


























// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card } from "@/components/ui/card";
// import { ChevronLeft, PlusCircle, Star, XCircle, Trash } from "lucide-react";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// export default function CreateActivityPage() {
//   const router = useRouter();
//   const [activityName, setActivityName] = useState("");
//   const [criteria, setCriteria] = useState([{ id: 1, name: "", rating: "", maxMarks: "" }]);
//   const [errors, setErrors] = useState<{
//     activityName?: string;
//     criteria: Record<number, { name?: string; rating?: string; maxMarks?: string }>;
//     general?: string;
//   }>({
//     criteria: {},
//   });
//   const [isSaved, setIsSaved] = useState(false);
//   const [activityId, setActivityId] = useState<string | null>(null);

//   const addCriteria = () => {
//     setCriteria([...criteria, { id: criteria.length + 1, name: "", rating: "", maxMarks: "" }]);
//   };

//   const removeCriteria = (id: number) => {
//     if (criteria.length > 1) {
//       setCriteria(criteria.filter((item) => item.id !== id));
//       // Clear errors for removed criteria
//       const newErrors = { ...errors };
//       delete newErrors.criteria[id];
//       setErrors(newErrors);
//     }
//   };

//   const validateCriteria = (criteriaItem: typeof criteria[0]) => {
//     const criteriaErrors: typeof errors.criteria[number] = {};
    
//     if (!criteriaItem.name.trim()) {
//       criteriaErrors.name = "Criteria name is required";
//     }
//     if (!criteriaItem.rating) {
//       criteriaErrors.rating = "Rating type is required";
//     }
//     if (!criteriaItem.maxMarks) {
//       criteriaErrors.maxMarks = "Max marks is required";
//     }

//     return criteriaErrors;
//   };

//   const handleSave = async () => {
//     const newErrors: typeof errors = { criteria: {} };
//     let hasErrors = false;

//     // Validate activity name
//     if (!activityName.trim()) {
//       newErrors.activityName = "Activity name is required";
//       hasErrors = true;
//     }

//     // Validate each criteria
//     criteria.forEach((item) => {
//       const criteriaErrors = validateCriteria(item);
//       if (Object.keys(criteriaErrors).length > 0) {
//         newErrors.criteria[item.id] = criteriaErrors;
//         hasErrors = true;
//       }
//     });

//     setErrors(newErrors);

//     if (hasErrors) {
//       return;
//     }

//     try {
//         const accessToken = localStorage.getItem("accessToken");
//         if (!accessToken) {
//           setErrors((prev) => ({
//             ...prev,
//             general: "Authorization token missing. Please log in again.",
//           }));
//           return;
//         }

//         const response = await fetch("/api/createactivity", {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${accessToken}`, 
//             },
//             body: JSON.stringify({
//                 activityName,
//                 createdWithRole: "HOST",  // Or the appropriate role
//                 rubricCriteria: criteria.map((c) => ({
//                     name: c.name,
//                     rating: c.rating,
//                     maxMarks: Number(c.maxMarks),  // Convert to number
//                 })),
//             }),
//           });

//       if (!response.ok) {
//         throw new Error("Failed to save activity");
//       }

//       const data = await response.json();
//       setActivityId(data.activityId); // Store the returned activity ID
//       setIsSaved(true);
//     } catch (error) {
//       setErrors((prev) => ({
//         ...prev,
//         general: error instanceof Error ? error.message : "Failed to save activity",
//       }));
//     }
//   };

//   const handleSchedule = () => {
//     // Navigate to schedule page with activity ID
//     if (activityId) {
//       router.push(`/host/scheduleactivity?id=${activityId}`);
//     } else {
//       // If we don't have an activity ID yet, we'll just navigate and handle it in the schedule page
//       router.push('/host/scheduleactivity');
//     }
//   };

//   return (
//     <div className="h-screen flex flex-col items-center bg-[#f9f9f9]">
//       {/* Navbar */}
//       <div className="w-full max-w-3xl flex items-center justify-between p-4 bg-[#4a3aff] text-white shadow-md">
//         <ChevronLeft className="w-6 h-6 cursor-pointer" onClick={() => router.back()} />
//         <h1 className="text-lg font-semibold">Create Activity</h1>
//         <div className="w-6"></div>
//       </div>

//       {/* Form Section */}
//       <div className="flex-1 overflow-y-auto p-4 w-full max-w-3xl space-y-4">
//         {errors.general && (
//           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
//             <span className="block sm:inline">{errors.general}</span>
//           </div>
//         )}

//         {/* Activity Name */}
//         <div>
//           <label className="text-sm font-bold text-gray-700">Activity Name *</label>
//           <Input
//             placeholder="Type activity name"
//             className={`mt-1 ${errors.activityName ? "border-red-500" : ""}`}
//             value={activityName}
//             onChange={(e) => setActivityName(e.target.value)}
//           />
//           {errors.activityName && (
//             <p className="text-red-500 text-xs mt-1">{errors.activityName}</p>
//           )}
//         </div>

//         {/* Add Criteria Section */}
//         <div className="space-y-4">
//           <div className="flex items-center justify-between">
//             <span className="text-sm font-bold text-gray-700">Add Criteria</span>
//             <Button variant="outline" size="icon" onClick={addCriteria}>
//               <PlusCircle className="w-5 h-5" />
//             </Button>
//           </div>

//           {/* Dynamic Criteria Fields */}
//           {criteria.map((item, index) => (
//             <Card key={item.id} className="p-4 space-y-2 border border-gray-300">
//               <div className="flex justify-between items-center mb-2">
//                 <span className="text-sm font-medium text-gray-500">
//                   Criteria {index + 1}
//                 </span>
//               </div>

//               <Input
//                 placeholder="Type criteria name..."
//                 value={item.name}
//                 className={errors.criteria[item.id]?.name ? "border-red-500" : ""}
//                 onChange={(e) => {
//                   const updatedCriteria = [...criteria];
//                   updatedCriteria[index].name = e.target.value;
//                   setCriteria(updatedCriteria);
//                 }}
//               />
//               {errors.criteria[item.id]?.name && (
//                 <p className="text-red-500 text-xs">{errors.criteria[item.id]?.name}</p>
//               )}

//               <Select
//                 value={item.rating}
//                 onValueChange={(value) => {
//                   const updatedCriteria = [...criteria];
//                   updatedCriteria[index].rating = value;
//                   setCriteria(updatedCriteria);
//                 }}
//               >
//                 <SelectTrigger className={`w-full ${errors.criteria[item.id]?.rating ? "border-red-500" : ""}`}>
//                   <SelectValue placeholder="Select rating type" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="rating">Rating</SelectItem>
//                   <SelectItem value="text">Text</SelectItem>
//                 </SelectContent>
//               </Select>
//               {errors.criteria[item.id]?.rating && (
//                 <p className="text-red-500 text-xs">{errors.criteria[item.id]?.rating}</p>
//               )}

//               <Select
//                 value={item.maxMarks}
//                 onValueChange={(value) => {
//                   const updatedCriteria = [...criteria];
//                   updatedCriteria[index].maxMarks = value;
//                   setCriteria(updatedCriteria);
//                 }}
//               >
//                 <SelectTrigger className={`w-full ${errors.criteria[item.id]?.maxMarks ? "border-red-500" : ""}`}>
//                   <SelectValue placeholder="Select max marks" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="5">5</SelectItem>
//                   <SelectItem value="10">10</SelectItem>
//                 </SelectContent>
//               </Select>
//               {errors.criteria[item.id]?.maxMarks && (
//                 <p className="text-red-500 text-xs">{errors.criteria[item.id]?.maxMarks}</p>
//               )}

//               {/* Star Rating Display */}
//               {item.rating === "rating" && (
//                 <div className="flex justify-center space-x-2 mt-2">
//                   {[1, 2, 3, 4, 5].map((num) => (
//                     <Star
//                       key={num}
//                       className={`w-6 h-6 ${
//                         num <= parseInt(item.maxMarks || "5") ? "text-yellow-400" : "text-gray-300"
//                       }`}
//                     />
//                   ))}
//                 </div>
//               )}

//               {/* Action Buttons */}
//               <div className="flex justify-end space-x-2 mt-2">
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={() => {
//                     const updatedCriteria = [...criteria];
//                     updatedCriteria[index] = {
//                       id: item.id,
//                       name: "",
//                       rating: "",
//                       maxMarks: "",
//                     };
//                     setCriteria(updatedCriteria);
//                   }}
//                 >
//                   <XCircle className="w-4 h-4 mr-1" /> Cancel
//                 </Button>
//                 {criteria.length > 1 && (
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     className="hover:bg-red-500 hover:text-white"
//                     onClick={() => removeCriteria(item.id)}
//                   >
//                     <Trash className="w-4 h-4 mr-1" /> Delete
//                   </Button>
//                 )}
//               </div>
//             </Card>
//           ))}
//         </div>

//         {/* Action Buttons */}
//         <div className="flex justify-between mt-6">
//           <Button variant="outline" onClick={handleSave}>
//             Save
//           </Button>
//           <Button
//             onClick={handleSchedule}
//             disabled={!isSaved}
//             className="bg-black text-white hover:bg-gray-800"
//           >
//             Schedule
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// }























































































// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card } from "@/components/ui/card";
// import { ChevronLeft, PlusCircle, Star, XCircle, Trash } from "lucide-react";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// export default function CreateActivityPage() {
//   const router = useRouter();
//   const [activityName, setActivityName] = useState("");
//   const [criteria, setCriteria] = useState([{ id: 1, name: "", rating: "", maxMarks: "" }]);
//   const [errors, setErrors] = useState<{
//     activityName?: string;
//     criteria: Record<number, { name?: string; rating?: string; maxMarks?: string }>;
//     general?: string;
//   }>({
//     criteria: {},
//   });
//   const [isSaved, setIsSaved] = useState(false);

//   const addCriteria = () => {
//     setCriteria([...criteria, { id: criteria.length + 1, name: "", rating: "", maxMarks: "" }]);
//   };

//   const removeCriteria = (id: number) => {
//     if (criteria.length > 1) {
//       setCriteria(criteria.filter((item) => item.id !== id));
//       // Clear errors for removed criteria
//       const newErrors = { ...errors };
//       delete newErrors.criteria[id];
//       setErrors(newErrors);
//     }
//   };

//   const validateCriteria = (criteriaItem: typeof criteria[0]) => {
//     const criteriaErrors: typeof errors.criteria[number] = {};
    
//     if (!criteriaItem.name.trim()) {
//       criteriaErrors.name = "Criteria name is required";
//     }
//     if (!criteriaItem.rating) {
//       criteriaErrors.rating = "Rating type is required";
//     }
//     if (!criteriaItem.maxMarks) {
//       criteriaErrors.maxMarks = "Max marks is required";
//     }

//     return criteriaErrors;
//   };

//   const handleSave = async () => {
//     const newErrors: typeof errors = { criteria: {} };
//     let hasErrors = false;

//     // Validate activity name
//     if (!activityName.trim()) {
//       newErrors.activityName = "Activity name is required";
//       hasErrors = true;
//     }

//     // Validate each criteria
//     criteria.forEach((item) => {
//       const criteriaErrors = validateCriteria(item);
//       if (Object.keys(criteriaErrors).length > 0) {
//         newErrors.criteria[item.id] = criteriaErrors;
//         hasErrors = true;
//       }
//     });

//     setErrors(newErrors);

//     if (hasErrors) {
//       return;
//     }

//     try {
//         const accessToken = localStorage.getItem("accessToken");
//         if (!accessToken) {
//           setErrors((prev) => ({
//             ...prev,
//             general: "Authorization token missing. Please log in again.",
//           }));
//           return;
//         }

//         const response = await fetch("/api/createactivity", {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${accessToken}`, 
//             },
//             body: JSON.stringify({
//                 activityName,
//                 createdWithRole: "HOST",  // Or the appropriate role
//                 rubricCriteria: criteria.map((c) => ({
//                     name: c.name,
//                     rating: c.rating,
//                     maxMarks: Number(c.maxMarks),  // Convert to number
//                 })),
//             }),
//           });

//       if (!response.ok) {
//         throw new Error("Failed to save activity");
//       }

//       setIsSaved(true);
//     } catch (error) {
//       setErrors((prev) => ({
//         ...prev,
//         general: error instanceof Error ? error.message : "Failed to save activity",
//       }));
//     }
//   };

//   return (
//     <div className="h-screen flex flex-col items-center bg-[#f9f9f9]">
//       {/* Navbar */}
//       <div className="w-full max-w-3xl flex items-center justify-between p-4 bg-[#4a3aff] text-white shadow-md">
//         <ChevronLeft className="w-6 h-6 cursor-pointer" onClick={() => router.back()} />
//         <h1 className="text-lg font-semibold">Create Activity</h1>
//         <div className="w-6"></div>
//       </div>

//       {/* Form Section */}
//       <div className="flex-1 overflow-y-auto p-4 w-full max-w-3xl space-y-4">
//         {errors.general && (
//           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
//             <span className="block sm:inline">{errors.general}</span>
//           </div>
//         )}

//         {/* Activity Name */}
//         <div>
//           <label className="text-sm font-bold text-gray-700">Activity Name *</label>
//           <Input
//             placeholder="Type activity name"
//             className={`mt-1 ${errors.activityName ? "border-red-500" : ""}`}
//             value={activityName}
//             onChange={(e) => setActivityName(e.target.value)}
//           />
//           {errors.activityName && (
//             <p className="text-red-500 text-xs mt-1">{errors.activityName}</p>
//           )}
//         </div>

//         {/* Add Criteria Section */}
//         <div className="space-y-4">
//           <div className="flex items-center justify-between">
//             <span className="text-sm font-bold text-gray-700">Add Criteria</span>
//             <Button variant="outline" size="icon" onClick={addCriteria}>
//               <PlusCircle className="w-5 h-5" />
//             </Button>
//           </div>

//           {/* Dynamic Criteria Fields */}
//           {criteria.map((item, index) => (
//             <Card key={item.id} className="p-4 space-y-2 border border-gray-300">
//               <div className="flex justify-between items-center mb-2">
//                 <span className="text-sm font-medium text-gray-500">
//                   Criteria {index + 1}
//                 </span>
//               </div>

//               <Input
//                 placeholder="Type criteria name..."
//                 value={item.name}
//                 className={errors.criteria[item.id]?.name ? "border-red-500" : ""}
//                 onChange={(e) => {
//                   const updatedCriteria = [...criteria];
//                   updatedCriteria[index].name = e.target.value;
//                   setCriteria(updatedCriteria);
//                 }}
//               />
//               {errors.criteria[item.id]?.name && (
//                 <p className="text-red-500 text-xs">{errors.criteria[item.id]?.name}</p>
//               )}

//               <Select
//                 value={item.rating}
//                 onValueChange={(value) => {
//                   const updatedCriteria = [...criteria];
//                   updatedCriteria[index].rating = value;
//                   setCriteria(updatedCriteria);
//                 }}
//               >
//                 <SelectTrigger className={`w-full ${errors.criteria[item.id]?.rating ? "border-red-500" : ""}`}>
//                   <SelectValue placeholder="Select rating type" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="rating">Rating</SelectItem>
//                   <SelectItem value="text">Text</SelectItem>
//                 </SelectContent>
//               </Select>
//               {errors.criteria[item.id]?.rating && (
//                 <p className="text-red-500 text-xs">{errors.criteria[item.id]?.rating}</p>
//               )}

//               <Select
//                 value={item.maxMarks}
//                 onValueChange={(value) => {
//                   const updatedCriteria = [...criteria];
//                   updatedCriteria[index].maxMarks = value;
//                   setCriteria(updatedCriteria);
//                 }}
//               >
//                 <SelectTrigger className={`w-full ${errors.criteria[item.id]?.maxMarks ? "border-red-500" : ""}`}>
//                   <SelectValue placeholder="Select max marks" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="5">5</SelectItem>
//                   <SelectItem value="10">10</SelectItem>
//                 </SelectContent>
//               </Select>
//               {errors.criteria[item.id]?.maxMarks && (
//                 <p className="text-red-500 text-xs">{errors.criteria[item.id]?.maxMarks}</p>
//               )}

//               {/* Star Rating Display */}
//               {item.rating === "rating" && (
//                 <div className="flex justify-center space-x-2 mt-2">
//                   {[1, 2, 3, 4, 5].map((num) => (
//                     <Star
//                       key={num}
//                       className={`w-6 h-6 ${
//                         num <= parseInt(item.maxMarks || "5") ? "text-yellow-400" : "text-gray-300"
//                       }`}
//                     />
//                   ))}
//                 </div>
//               )}

//               {/* Action Buttons */}
//               <div className="flex justify-end space-x-2 mt-2">
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={() => {
//                     const updatedCriteria = [...criteria];
//                     updatedCriteria[index] = {
//                       id: item.id,
//                       name: "",
//                       rating: "",
//                       maxMarks: "",
//                     };
//                     setCriteria(updatedCriteria);
//                   }}
//                 >
//                   <XCircle className="w-4 h-4 mr-1" /> Cancel
//                 </Button>
//                 {criteria.length > 1 && (
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     className="hover:bg-red-500 hover:text-white"
//                     onClick={() => removeCriteria(item.id)}
//                   >
//                     <Trash className="w-4 h-4 mr-1" /> Delete
//                   </Button>
//                 )}
//               </div>
//             </Card>
//           ))}
//         </div>

//         {/* Action Buttons */}
//         <div className="flex justify-between mt-6">
//           <Button variant="outline" onClick={handleSave}>
//             Save
//           </Button>
//           <Button
//             disabled={!isSaved}
//             className="bg-black text-white hover:bg-gray-800"
//             onClick={() => router.push("/host/schedule")}  // Navigate to the schedule page
//         >
//             Schedule
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// }