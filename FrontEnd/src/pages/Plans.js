// src/pages/PlansPage.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Zap, Award, Star } from "lucide-react";

export default function PlansPage() {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Free",
      price: ["0", "LKR", "/ month"],
      features: [
        {
          label: "Collaborative writing (up to 5 collaborators)",
          included: true,
        },
        { label: "10 AI-powered IEEE text conversions", included: true },
        { label: "10 instant Mind-map generations", included: true },
        { label: "2 Shared Mind-maps", included: true },
        { label: "10 Smart citation creations", included: true },
        { label: "Limited-knowledge PDF Chat", included: true },
        { label: "Access to IEEE document converter", included: false },
        { label: "Plagiarism checker", included: false },
      ],
      actionText: "You’re on Free",
      actionHandler: null,
      highlighted: false,
      icon: (
        <Zap
          size={24}
          className="me-2"
          style={{ color: "var(--primary-color)" }}
        />
      ),
    },
    {
      name: "Pro",
      price: ["5 000", "LKR", "/ month"],
      features: [
        {
          label: "Collaborative writing (unlimited collaborators)",
          included: true,
        },
        { label: "Unlimited AI-powered IEEE conversions", included: true },
        { label: "Unlimited Mind-map generation", included: true },
        { label: "Unlimited Shared Mind-maps", included: true },
        { label: "Image-matching integration for Mind-maps", included: true },
        { label: "Unlimited Smart citation creations", included: true },
        { label: "Full-access IEEE document converter", included: true },
        { label: "Advanced plagiarism checker", included: true },
        { label: "Full-knowledge PDF Chat", included: true },
      ],
      actionText: "Upgrade to Pro",
      actionHandler: () => navigate("/upgrade"),
      highlighted: true,
      icon: (
        <Award
          size={24}
          className="me-2"
          style={{ color: "var(--primary-color)" }}
        />
      ),
    },
  ];

  return (
    <div className="container py-5">
      <style>
        {`
          .container, .container * {
            font-family: 'Roboto Condensed', serif !important;
          }
        `}
      </style>
      {/* Header */}
      <div className="text-center mb-5">
        <h2 className="fw-bold">Choose Your Plan</h2>
        <p className="text-muted">
          Scale your writing with the right features.
        </p>
      </div>

      <div className="row g-4">
        {plans.map((plan) => (
          <div key={plan.name} className="col-12 col-md-6">
            <div
              className={`card h-100 position-relative overflow-hidden ${
                plan.highlighted ? "border-0" : ""
              }`}
              style={{
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                transition: "transform .2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-6px)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              {plan.highlighted && (
                <div
                  className="position-absolute top-0 end-0 px-3 py-1"
                  style={{
                    backgroundColor: "var(--primary-color)",
                    color: "#fff",
                    borderBottomLeftRadius: 8,
                  }}
                >
                  <Star size={16} className="me-1" />
                  Popular
                </div>
              )}

              <div className="card-body d-flex flex-column">
                {/* Title + Icon */}
                <div className="d-flex align-items-center mb-3">
                  {/*
            Icon: give it inline style for color
          */}
                  {React.cloneElement(plan.icon, {
                    style: {
                      ...(plan.icon.props.style || {}),
                      color: plan.highlighted
                        ? "var(--primary-color)"
                        : "var(--secondary-color)",
                    },
                  })}

                  {/*
            Heading: inline style for color
          */}
                  <h4
                    className="mb-0"
                    style={{
                      color: plan.highlighted
                        ? "var(--primary-color)"
                        : "var(--secondary-color)",
                    }}
                  >
                    {plan.name}
                  </h4>
                </div>

                {/* Price */}
                <div className="d-flex align-items-baseline mb-4">
                  <span className="display-5 fw-bold">{plan.price[0]}</span>
                  <span className="ms-1 text-muted">{plan.price[1]}</span>
                  <span className="ms-1 text-muted">{plan.price[2]}</span>
                </div>

                {/* Features */}
                <ul className="list-unstyled mb-4 flex-grow-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="d-flex align-items-center mb-2">
                      {f.included ? (
                        <CheckCircle2 size={18} className="me-2 text-success" />
                      ) : (
                        <XCircle size={18} className="me-2 text-danger" />
                      )}
                      <span className={f.included ? "" : "text-muted"}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Action button */}
                <button
                  onClick={plan.actionHandler}
                  disabled={!plan.actionHandler}
                  className={`btn w-100 py-2 mt-auto ${
                    plan.highlighted
                      ? "primary-button"
                      : "btn-outline-secondary text-secondary"
                  }`}
                  style={{
                    fontWeight: 600,
                    cursor: plan.actionHandler ? "pointer" : "not-allowed",
                    backgroundColor: !plan.actionHandler
                      ? "#e0e0e0"
                      : undefined,
                    borderColor: !plan.actionHandler ? "#ccc" : undefined,
                    color: !plan.actionHandler ? "#666" : undefined,
                  }}
                >
                  {plan.actionText}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
