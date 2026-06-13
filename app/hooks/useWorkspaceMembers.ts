"use client";

import { useState, useEffect } from "react";
import {
  supabaseMemberClient,
  supabaseInvitationClient,
  type SupabaseMeetingMember,
  type SupabaseMeetingInvitation,
} from "@/app/lib/supabaseClient";

interface AuthSession {
  accessToken: string;
  user: { id: string };
}

interface UseWorkspaceMembersReturn {
  workspaceMeetingMembers: SupabaseMeetingMember[];
  workspaceMeetingInvitations: SupabaseMeetingInvitation[];
  isMeetingOwner: boolean;
  isLoadingWorkspaceMembers: boolean;
  isLoadingWorkspaceInvitations: boolean;
  workspaceMembersMessage: string;
  workspaceInviteEmail: string;
  setWorkspaceInviteEmail: (email: string) => void;
  isCreatingWorkspaceInvitation: boolean;
  isRemovingWorkspaceMember: string | null;
  isRevokingWorkspaceInvitation: string | null;
  getWorkspaceMemberDisplayName: (member: SupabaseMeetingMember) => string;
  handleWorkspaceInviteMember: () => Promise<void>;
  handleWorkspaceRemoveMember: (member: SupabaseMeetingMember) => Promise<void>;
  handleWorkspaceRevokeInvitation: (invitationId: string) => Promise<void>;
}

export function useWorkspaceMembers(
  authSession: AuthSession | null,
  selectedMeetingId: string,
): UseWorkspaceMembersReturn {
  const [workspaceMeetingMembers, setWorkspaceMeetingMembers] = useState<
    SupabaseMeetingMember[]
  >([]);
  const [workspaceMeetingInvitations, setWorkspaceMeetingInvitations] =
    useState<SupabaseMeetingInvitation[]>([]);
  const [isLoadingWorkspaceMembers, setIsLoadingWorkspaceMembers] =
    useState(false);
  const [isLoadingWorkspaceInvitations, setIsLoadingWorkspaceInvitations] =
    useState(false);
  const [workspaceMembersMessage, setWorkspaceMembersMessage] = useState("");
  const [workspaceInviteEmail, setWorkspaceInviteEmail] = useState("");
  const [isCreatingWorkspaceInvitation, setIsCreatingWorkspaceInvitation] =
    useState(false);
  const [isRemovingWorkspaceMember, setIsRemovingWorkspaceMember] = useState<
    string | null
  >(null);
  const [isRevokingWorkspaceInvitation, setIsRevokingWorkspaceInvitation] =
    useState<string | null>(null);

  const isMeetingOwner = workspaceMeetingMembers.some(
    (m) => m.role === "owner" && m.user_id === authSession?.user.id,
  );

  // Load members automatically so isMeetingOwner is populated without opening the
  // members modal. Required for owner-only menu items like Edit Playbook.
  useEffect(() => {
    if (!authSession || !selectedMeetingId) return;
    supabaseMemberClient
      .listMeetingMembers({ accessToken: authSession.accessToken, meetingId: selectedMeetingId })
      .then(setWorkspaceMeetingMembers)
      .catch(() => undefined);
  }, [authSession, selectedMeetingId]);

  const getWorkspaceMemberDisplayName = (member: SupabaseMeetingMember) =>
    member.display_name ?? member.email ?? member.user_id;

  const handleWorkspaceInviteMember = async () => {
    if (
      !authSession ||
      !selectedMeetingId ||
      isCreatingWorkspaceInvitation ||
      !isMeetingOwner
    )
      return;
    const trimmedEmail = workspaceInviteEmail.trim();
    if (!trimmedEmail) {
      setWorkspaceMembersMessage("Enter an email address to invite.");
      return;
    }
    setIsCreatingWorkspaceInvitation(true);
    setWorkspaceMembersMessage("");
    try {
      const invitation = await supabaseInvitationClient.createInvitation({
        accessToken: authSession.accessToken,
        meetingId: selectedMeetingId,
        email: trimmedEmail,
      });
      setWorkspaceMeetingInvitations((prev) => [invitation, ...prev]);
      setWorkspaceInviteEmail("");
      setWorkspaceMembersMessage(`Invited ${invitation.email} as an editor.`);
    } catch (error) {
      setWorkspaceMembersMessage(
        error instanceof Error
          ? error.message
          : "Could not create this invitation.",
      );
    } finally {
      setIsCreatingWorkspaceInvitation(false);
    }
  };

  const handleWorkspaceRemoveMember = async (
    member: SupabaseMeetingMember,
  ) => {
    if (
      !authSession ||
      !selectedMeetingId ||
      isRemovingWorkspaceMember ||
      !isMeetingOwner
    )
      return;
    const name = getWorkspaceMemberDisplayName(member);
    if (!window.confirm(`Remove ${name} from this meeting?`)) return;
    setIsRemovingWorkspaceMember(member.user_id);
    setWorkspaceMembersMessage("");
    try {
      await supabaseMemberClient.removeMeetingEditor({
        accessToken: authSession.accessToken,
        meetingId: selectedMeetingId,
        userId: member.user_id,
      });
      setWorkspaceMeetingMembers((prev) =>
        prev.filter((m) => m.user_id !== member.user_id),
      );
      setWorkspaceMembersMessage(`Removed ${name} from this meeting.`);
    } catch (error) {
      setWorkspaceMembersMessage(
        error instanceof Error
          ? error.message
          : "Could not remove this member.",
      );
    } finally {
      setIsRemovingWorkspaceMember(null);
    }
  };

  const handleWorkspaceRevokeInvitation = async (invitationId: string) => {
    if (!authSession || isRevokingWorkspaceInvitation || !isMeetingOwner)
      return;
    setIsRevokingWorkspaceInvitation(invitationId);
    setWorkspaceMembersMessage("");
    try {
      const revoked = await supabaseInvitationClient.revokeInvitation({
        accessToken: authSession.accessToken,
        invitationId,
      });
      setWorkspaceMeetingInvitations((prev) =>
        prev.filter((inv) => inv.id !== revoked.id),
      );
      setWorkspaceMembersMessage(`Revoked invite for ${revoked.email}.`);
    } catch (error) {
      setWorkspaceMembersMessage(
        error instanceof Error
          ? error.message
          : "Could not revoke this invitation.",
      );
    } finally {
      setIsRevokingWorkspaceInvitation(null);
    }
  };

  return {
    workspaceMeetingMembers,
    workspaceMeetingInvitations,
    isMeetingOwner,
    isLoadingWorkspaceMembers,
    isLoadingWorkspaceInvitations,
    workspaceMembersMessage,
    workspaceInviteEmail,
    setWorkspaceInviteEmail,
    isCreatingWorkspaceInvitation,
    isRemovingWorkspaceMember,
    isRevokingWorkspaceInvitation,
    getWorkspaceMemberDisplayName,
    handleWorkspaceInviteMember,
    handleWorkspaceRemoveMember,
    handleWorkspaceRevokeInvitation,
  };
}
