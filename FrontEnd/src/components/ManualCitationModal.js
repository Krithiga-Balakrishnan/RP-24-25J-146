import React, { useState } from "react";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";

const ReferenceModal = ({
    showReferenceModal,
    setShowReferenceModal,
    newReference,
    setNewReference,
    references,
    setReferences,
    padId,
    onCitationData,
    onSaveReference,
}) => {
    const [formErrors, setFormErrors] = useState({});
    const [sourceType, setSourceType] = useState("journal"); // or "conference"
    const [isSaving, setIsSaving] = useState(false);


    if (!showReferenceModal) return null;
    const baseApiUrl_Manual_Citation = `${process.env.REACT_APP_BACKEND_API_URL_MANUAL_CITATION}`;

    const handleFieldChange = (field, value) => {
        setNewReference(prev => ({ ...prev, [field]: value }));
        if (formErrors[field] && value.trim()) {
            setFormErrors(prev => {
                const { [field]: _, ...rest } = prev;
                return rest;
            });
        }
    };

    const handleFieldBlur = (field, value) => {
        if (!value.trim()) {
            setFormErrors(prev => ({ ...prev, [field]: "This field is required." }));
        }
    };
    const validateForm = () => {
        const requiredFields = ["author", "title", "journal", "year", "pages"];
        const errors = {};
        requiredFields.forEach(field => {
            if (!newReference[field] || newReference[field].trim() === "") {
                errors[field] = "This field is required.";
            }
        });
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSaveReference = async () => {
        if (!validateForm()) return;

        setIsSaving(true);
        setFormErrors({});
        let errorMessage = "";

        try {
            // Generate unique key
            const existingKeys = new Set(references.map(ref => ref.key));
            let lastKey = 0;
            references.forEach(ref => {
                const num = parseInt(ref.key, 10);
                if (!isNaN(num)) lastKey = Math.max(lastKey, num);
            });

            let nextKey = lastKey + 1;
            while (existingKeys.has(String(nextKey))) {
                nextKey += 1;
            }

            // Prepare author values
            const authorsArray = newReference.author.split(",").map(a => a.trim()); // for citation API
            const authorsString = authorsArray.join(", "); // for DB

            // Build request for citation API
            const citationRequestBody = {
                type: sourceType,
                authors: authorsArray,
                title: newReference.title,
                journal: newReference.journal,
                year: parseInt(newReference.year, 10),
                pages: newReference.pages,
                doi: newReference.doi,
                location: sourceType === "conference" ? newReference.location : undefined,
                volume: sourceType === "journal" ? newReference.volume : undefined,
                issue: sourceType === "journal" ? newReference.issue : undefined,
            };

            // 1. Generate citation
            const citationResponse = await fetch(`${baseApiUrl_Manual_Citation}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(citationRequestBody),
            });
            if (!citationResponse.ok) {
                const errorText = await citationResponse.text();
                throw new Error(`Failed to generate citation: ${errorText}`);
            }

            let citation = (await citationResponse.json()).citation || "";

            // 2. Clean citation
            citation = citation
                .replace(/\bNone\b/gi, "")
                .replace(/doi:\s*(None|N\/A|nan|unknown)\b\.?/gi, "")
                .replace(/\bDOI:/gi, "doi:")
                .replace(/,?\s*pp?\.\s*[-–]\s*,?/gi, "")
                .replace(/,+/g, ",")
                .replace(/\s{2,}/g, " ")
                .trim()
                .replace(/[,\.\s]+$/, "");

            // 3. Save to DB with string author
            const saveRequestBody = {
                padId,
                key: String(nextKey),
                citation: citation,
                author: authorsString,
                title: newReference.title,
                journal: newReference.journal,
                year: parseInt(newReference.year, 10),
                pages: newReference.pages,
                doi: newReference.doi,
                location: sourceType === "conference" ? newReference.location : undefined,
                volume: sourceType === "journal" ? newReference.volume : undefined,
                number: sourceType === "journal" ? newReference.issue : undefined,
            };

            const saveResponse = await fetch(
                `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/${padId}/save-citation`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(saveRequestBody),
                }
            );
            console.log(" Awaiting response from save-citation API...");
            if (!saveResponse.ok) {
                const errorText = await saveResponse.text();
                throw new Error(`Failed to save citation: ${errorText}`);
            }
            const saveData = await saveResponse.json();
            console.log(" Reference saved successfully!", saveData);

            const finalReference = {
                ...newReference,
                key: String(nextKey),
                citation: citation,
            };
            console.log("Final Reference:", finalReference);

            if (typeof onCitationData === "function") {
                onCitationData(finalReference);
            }
            toast.success("📚 Reference saved successfully!");
            setShowReferenceModal(false);
            return finalReference;
        } catch (error) {
            errorMessage = error.message || "An unknown error occurred.";
            toast.error(errorMessage);
            console.error("Error saving reference:", errorMessage);
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div
            style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                zIndex: 1100,
                width: "400px",
            }}
        >
            <h3>Add Reference</h3>
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <button
                    onClick={() => setSourceType("journal")}
                    style={{
                        backgroundColor: sourceType === "journal" ? "#56008a" : "#eee",
                        color: sourceType === "journal" ? "#fff" : "#000",
                        padding: "6px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "5px",
                        cursor: "pointer",
                    }}
                >
                    Journal
                </button>
                <button
                    onClick={() => setSourceType("conference")}
                    style={{
                        backgroundColor: sourceType === "conference" ? "#56008a" : "#eee",
                        color: sourceType === "conference" ? "#fff" : "#000",
                        padding: "6px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "5px",
                        cursor: "pointer",
                    }}
                >
                    Conference
                </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input
                    className="input-small reference-key"
                    type="text"
                    value={newReference.key}
                    placeholder="Reference Key"
                    onChange={(e) =>
                        setNewReference({ ...newReference, key: e.target.value })
                    }
                />
                <input
                    className="input-small reference-author"
                    type="text"
                    value={newReference.author}
                    placeholder="Author(s)"
                    onChange={(e) => handleFieldChange("author", e.target.value)}
                    onBlur={(e) => handleFieldBlur("author", e.target.value)}
                    style={{
                        borderColor: formErrors.author ? "#dc3545" : "#ced4da",
                        backgroundColor: formErrors.author ? "#fff5f5" : "white",
                    }}
                />
                <input
                    className="input-small reference-title"
                    type="text"
                    value={newReference.title}
                    placeholder="Title"
                    onChange={(e) => handleFieldChange("title", e.target.value)}
                    onBlur={(e) => handleFieldBlur("title", e.target.value)}
                    style={{
                        borderColor: formErrors.title ? "#dc3545" : "#ced4da",
                        backgroundColor: formErrors.title ? "#fff5f5" : "white",
                    }}
                />
                <input
                    className="input-small reference-journal"
                    type="text"
                    value={newReference.journal}
                    placeholder={sourceType === "journal" ? "Journal Name" : "Conference Name"}
                    onChange={(e) => handleFieldChange("journal", e.target.value)}
                    onBlur={(e) => handleFieldBlur("journal", e.target.value)}
                    style={{
                        borderColor: formErrors.journal ? "#dc3545" : "#ced4da",
                        backgroundColor: formErrors.journal ? "#fff5f5" : "white",
                    }}
                />

                <input
                    className="input-small reference-year"
                    type="text"
                    value={newReference.year}
                    placeholder="Year"
                    onChange={(e) => handleFieldChange("year", e.target.value)}
                    onBlur={(e) => handleFieldBlur("year", e.target.value)}
                    style={{
                        borderColor: formErrors.year ? "#dc3545" : "#ced4da",
                        backgroundColor: formErrors.year ? "#fff5f5" : "white",
                    }}
                />
                <input
                    className="input-small reference-pages"
                    type="text"
                    value={newReference.pages}
                    placeholder="Pages"
                    onChange={(e) => handleFieldChange("pages", e.target.value)}
                    onBlur={(e) => handleFieldBlur("pages", e.target.value)}
                    style={{
                        borderColor: formErrors.pages ? "#dc3545" : "#ced4da",
                        backgroundColor: formErrors.pages ? "#fff5f5" : "white",
                    }}
                />
                {sourceType === "journal" ? (
                    <>
                        <input
                            type="text"
                            className="input-small reference-volume"
                            value={newReference.volume || ""}
                            placeholder="Volume"
                            onChange={(e) => handleFieldChange("volume", e.target.value)}
                            style={{
                                borderColor: formErrors.volume ? "#dc3545" : "#ced4da",
                                backgroundColor: formErrors.volume ? "#fff5f5" : "white",
                            }}
                        />
                        <input
                            type="text"
                            className="input-small reference-issue"
                            value={newReference.issue || ""}
                            placeholder="Issue"
                            onChange={(e) => handleFieldChange("issue", e.target.value)}
                            style={{
                                borderColor: formErrors.issue ? "#dc3545" : "#ced4da",
                                backgroundColor: formErrors.issue ? "#fff5f5" : "white",
                            }}
                        />
                    </>
                ) : (
                    <input
                        className="input-small reference-volume"
                        type="text"
                        value={newReference.location}
                        placeholder="Conference Location"
                        onChange={(e) => handleFieldChange("location", e.target.value)}
                        onBlur={(e) => handleFieldBlur("location", e.target.value)}
                        style={{
                            borderColor: formErrors.location ? "#dc3545" : "#ced4da",
                            backgroundColor: formErrors.location ? "#fff5f5" : "white",
                        }}
                    />
                )}
                <input
                    className="input-small reference-doi"
                    type="text"
                    value={newReference.doi}
                    placeholder="DOI (optional)"
                    onChange={(e) =>
                        setNewReference({ ...newReference, doi: e.target.value })
                    }
                />

            </div>
            <div
                style={{
                    marginTop: "15px",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                }}
            >
                <button
                    className="custom-button"
                    onClick={async () => {
                        setFormErrors({});
                        // await onSaveReference(newReference);
                        setShowReferenceModal(false);
                    }}
                    style={{
                        backgroundColor: "#aaa",
                        color: "#fff",
                        padding: "8px 12px",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                    }}
                >
                    Cancel
                </button>
                <button
                    className="custom-button"
                    onClick={handleSaveReference}
                    style={{
                        backgroundColor: "#56008a",
                        color: "#fff",
                        padding: "8px 12px",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                    }}
                    disabled={isSaving}
                >
                    {isSaving ? "Saving..." : "Save Reference"}
                </button>
            </div>
        </div>
    );
};

export default ReferenceModal;
