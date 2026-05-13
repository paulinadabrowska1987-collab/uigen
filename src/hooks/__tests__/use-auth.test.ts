import { renderHook, act, waitFor } from "@testing-library/react";
import { test, expect, vi, beforeEach } from "vitest";
import { useAuth } from "@/hooks/use-auth";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Initial state ────────────────────────────────────────────────────────────

test("isLoading starts as false", () => {
  const { result } = renderHook(() => useAuth());
  expect(result.current.isLoading).toBe(false);
});

test("exposes signIn, signUp, and isLoading", () => {
  const { result } = renderHook(() => useAuth());
  expect(typeof result.current.signIn).toBe("function");
  expect(typeof result.current.signUp).toBe("function");
  expect(typeof result.current.isLoading).toBe("boolean");
});

// ─── signIn ───────────────────────────────────────────────────────────────────

test("signIn returns the auth result on success", async () => {
  (signInAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue(null);
  (getProjects as any).mockResolvedValue([{ id: "proj-1" }]);

  const { result } = renderHook(() => useAuth());

  let authResult: any;
  await act(async () => {
    authResult = await result.current.signIn("user@test.com", "password123");
  });

  expect(authResult).toEqual({ success: true });
});

test("signIn returns the auth result on failure", async () => {
  (signInAction as any).mockResolvedValue({ success: false, error: "Invalid credentials" });

  const { result } = renderHook(() => useAuth());

  let authResult: any;
  await act(async () => {
    authResult = await result.current.signIn("user@test.com", "wrong");
  });

  expect(authResult).toEqual({ success: false, error: "Invalid credentials" });
});

test("signIn sets isLoading to true while in progress", async () => {
  let resolveSignIn!: (value: any) => void;
  const pending = new Promise<any>((resolve) => { resolveSignIn = resolve; });
  (signInAction as any).mockReturnValue(pending);

  const { result } = renderHook(() => useAuth());

  act(() => {
    void result.current.signIn("user@test.com", "password123");
  });

  await waitFor(() => expect(result.current.isLoading).toBe(true));

  await act(async () => {
    resolveSignIn({ success: false });
    await pending;
  });

  expect(result.current.isLoading).toBe(false);
});

test("signIn resets isLoading to false after success", async () => {
  (signInAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue(null);
  (getProjects as any).mockResolvedValue([{ id: "proj-1" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@test.com", "password123");
  });

  expect(result.current.isLoading).toBe(false);
});

test("signIn resets isLoading to false after failure", async () => {
  (signInAction as any).mockResolvedValue({ success: false, error: "Invalid credentials" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@test.com", "wrong");
  });

  expect(result.current.isLoading).toBe(false);
});

test("signIn does not trigger post-sign-in logic on failure", async () => {
  (signInAction as any).mockResolvedValue({ success: false, error: "Invalid credentials" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@test.com", "wrong");
  });

  expect(getAnonWorkData).not.toHaveBeenCalled();
  expect(getProjects).not.toHaveBeenCalled();
  expect(createProject).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});

// ─── signUp ───────────────────────────────────────────────────────────────────

test("signUp returns the auth result on success", async () => {
  (signUpAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue(null);
  (getProjects as any).mockResolvedValue([{ id: "proj-1" }]);

  const { result } = renderHook(() => useAuth());

  let authResult: any;
  await act(async () => {
    authResult = await result.current.signUp("new@test.com", "password123");
  });

  expect(authResult).toEqual({ success: true });
});

test("signUp returns the auth result on failure", async () => {
  (signUpAction as any).mockResolvedValue({ success: false, error: "Email already registered" });

  const { result } = renderHook(() => useAuth());

  let authResult: any;
  await act(async () => {
    authResult = await result.current.signUp("existing@test.com", "password123");
  });

  expect(authResult).toEqual({ success: false, error: "Email already registered" });
});

test("signUp sets isLoading to true while in progress", async () => {
  let resolveSignUp!: (value: any) => void;
  const pending = new Promise<any>((resolve) => { resolveSignUp = resolve; });
  (signUpAction as any).mockReturnValue(pending);

  const { result } = renderHook(() => useAuth());

  act(() => {
    void result.current.signUp("new@test.com", "password123");
  });

  await waitFor(() => expect(result.current.isLoading).toBe(true));

  await act(async () => {
    resolveSignUp({ success: false });
    await pending;
  });

  expect(result.current.isLoading).toBe(false);
});

test("signUp resets isLoading to false after success", async () => {
  (signUpAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue(null);
  (getProjects as any).mockResolvedValue([{ id: "proj-1" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("new@test.com", "password123");
  });

  expect(result.current.isLoading).toBe(false);
});

test("signUp resets isLoading to false after failure", async () => {
  (signUpAction as any).mockResolvedValue({ success: false, error: "Email already registered" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("existing@test.com", "password123");
  });

  expect(result.current.isLoading).toBe(false);
});

test("signUp does not trigger post-sign-in logic on failure", async () => {
  (signUpAction as any).mockResolvedValue({ success: false, error: "Email already registered" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("existing@test.com", "password123");
  });

  expect(getAnonWorkData).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});

test("signUp runs post-sign-in logic on success", async () => {
  (signUpAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue(null);
  (getProjects as any).mockResolvedValue([{ id: "proj-1" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("new@test.com", "password123");
  });

  expect(getAnonWorkData).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/proj-1");
});

// ─── post-sign-in: anonymous work ─────────────────────────────────────────────

test("creates a project from anon work and redirects when messages exist", async () => {
  const anonWork = {
    messages: [{ role: "user", content: "Make a button" }],
    fileSystemData: { "/": { type: "directory" } },
  };

  (signInAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue(anonWork);
  (createProject as any).mockResolvedValue({ id: "anon-proj-1" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@test.com", "password123");
  });

  expect(createProject).toHaveBeenCalledWith({
    name: expect.stringContaining("Design from"),
    messages: anonWork.messages,
    data: anonWork.fileSystemData,
  });
  expect(clearAnonWork).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/anon-proj-1");
});

test("does not call getProjects when anon work exists with messages", async () => {
  (signInAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue({
    messages: [{ role: "user", content: "Hello" }],
    fileSystemData: {},
  });
  (createProject as any).mockResolvedValue({ id: "anon-proj-1" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@test.com", "password123");
  });

  expect(getProjects).not.toHaveBeenCalled();
});

// ─── post-sign-in: no anonymous work ─────────────────────────────────────────

test("redirects to the most recent existing project when no anon work", async () => {
  (signInAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue(null);
  (getProjects as any).mockResolvedValue([{ id: "proj-recent" }, { id: "proj-older" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@test.com", "password123");
  });

  expect(mockPush).toHaveBeenCalledWith("/proj-recent");
  expect(createProject).not.toHaveBeenCalled();
});

test("creates a new blank project when no anon work and no existing projects", async () => {
  (signInAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue(null);
  (getProjects as any).mockResolvedValue([]);
  (createProject as any).mockResolvedValue({ id: "brand-new" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@test.com", "password123");
  });

  expect(createProject).toHaveBeenCalledWith({
    name: expect.stringMatching(/^New Design #\d+$/),
    messages: [],
    data: {},
  });
  expect(mockPush).toHaveBeenCalledWith("/brand-new");
});

// ─── post-sign-in: edge cases ─────────────────────────────────────────────────

test("treats anon work with empty messages as no work and falls through to existing projects", async () => {
  (signInAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue({ messages: [], fileSystemData: {} });
  (getProjects as any).mockResolvedValue([{ id: "existing-proj" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@test.com", "password123");
  });

  expect(createProject).not.toHaveBeenCalled();
  expect(clearAnonWork).not.toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/existing-proj");
});

test("treats null anon work data as no work", async () => {
  (signInAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue(null);
  (getProjects as any).mockResolvedValue([{ id: "existing-proj" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@test.com", "password123");
  });

  expect(clearAnonWork).not.toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/existing-proj");
});
