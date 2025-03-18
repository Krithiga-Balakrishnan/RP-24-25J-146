import React from "react";

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
    if (!showReferenceModal) return null;
    const baseApiUrl_Manual_Citation = `${process.env.REACT_APP_BACKEND_API_URL_MANUAL_CITATION}`;
    const handleSaveReference = async () => {
        // Compute the next key based on existing references.
        const lastKey = Array.isArray(references)
            ? references.reduce((max, ref) => {
                const numericKey = parseInt(ref.key, 10) || 0;
                return numericKey > max ? numericKey : max;
            }, 0)
            : 0;
        const nextKey = lastKey + 1;

        // Build the request body from the manual input.
        const requestBody = {
            authors: newReference.author.split(",").map(a => a.trim()),
            title: newReference.title,
            journal: newReference.journal,
            year: parseInt(newReference.year, 10),
            location: newReference.location,
            pages: newReference.pages,
            doi: newReference.doi,
        };
      
        try {
            const citationResponse = await fetch(
                `${process.env.REACT_APP_BACKEND_API_URL_MANUAL_CITATION}/generate_manual_citation/`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody),
                }
            );

            console.log(" Awaiting response from generate_manual_citation API...");
            if (!citationResponse.ok) {
                const errorText = await citationResponse.text();
                throw new Error(`Failed to generate citation: ${errorText}`);
            }
            const citationDataJSON = await citationResponse.json();
            console.log(" Citation generated successfully!", citationDataJSON);
            const generatedCitation = citationDataJSON.citation || "Citation not available.";

            // Now, call the API to save the reference in the DB, including the generated citation.
            const saveResponse = await fetch(
                `${process.env.REACT_APP_BACKEND_API_URL}/api/pads/${padId}/save-citation`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        padId,
                        key: String(nextKey),
                        citation: generatedCitation,
                        ...requestBody,
                    }),
                }
            );

            console.log(" Awaiting response from save-citation API...");
            if (!saveResponse.ok) {
                const errorText = await saveResponse.text();
                throw new Error(`Failed to save citation: ${errorText}`);
            }
            const saveData = await saveResponse.json();
            console.log(" Reference saved successfully!", saveData);

            const finalReference = { ...newReference, key: String(nextKey), citation: generatedCitation };
            console.log("Final Reference:", finalReference);

            if (typeof onCitationData === "function") {
                onCitationData(finalReference);
            }

            // Close the modal.
            setShowReferenceModal(false);
            return finalReference;
        } catch (error) {
          console.error(" Error in handleSaveReference:", error);
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
                    onChange={(e) =>
                        setNewReference({ ...newReference, author: e.target.value })
                    }
                />
                <input
                    className="input-small reference-title"
                    type="text"
                    value={newReference.title}
                    placeholder="Title"
                    onChange={(e) =>
                        setNewReference({ ...newReference, title: e.target.value })
                    }
                />
                <input
                    className="input-small reference-journal"
                    type="text"
                    value={newReference.journal}
                    placeholder="Conference"
                    onChange={(e) =>
                        setNewReference({ ...newReference, journal: e.target.value })
                    }
                />
                <input
                    className="input-small reference-year"
                    type="text"
                    value={newReference.year}
                    placeholder="Year"
                    onChange={(e) =>
                        setNewReference({ ...newReference, year: e.target.value })
                    }
                />
                <input
                    className="input-small reference-volume"
                    type="text"
                    value={newReference.location}
                    placeholder="Conference Location"
                    onChange={(e) =>
                        setNewReference({ ...newReference, location: e.target.value })
                    }
                />
                <input
                    className="input-small reference-number"
                    type="text"
                    value={newReference.doi}
                    placeholder="doi"
                    onChange={(e) =>
                        setNewReference({ ...newReference, doi: e.target.value })
                    }
                />
                <input
                    className="input-small reference-pages"
                    type="text"
                    value={newReference.pages}
                    placeholder="Pages"
                    onChange={(e) =>
                        setNewReference({ ...newReference, pages: e.target.value })
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
                        await onSaveReference(newReference);
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
                >
                    Save Reference
                </button>
            </div>
        </div>
    );
};

export default ReferenceModal;
