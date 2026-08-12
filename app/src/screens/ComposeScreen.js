import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import {
  deleteDraft,
  getDraft,
  saveDraft,
  setLastDraftId,
} from '../drafts';
import { buildEmailHtml } from '../emailHtml';
import { addSentEmail } from '../sent';
import { getDefaultSmtpId, getSmtpAccounts, setDefaultSmtpId, smtpIsConfigured } from '../smtpConfig';
import { sendEmail as smtpSendEmail } from '../smtp';
import { getTemplateById, resolveDefaultTemplate } from '../templates';
import AccountPickerModal from '../components/AccountPickerModal';
import CcBccModal from '../components/CcBccModal';
import CodeEditor from '../components/CodeEditor';
import RichEditor from '../components/RichEditor';
import TemplateLibrary from '../components/TemplateLibrary';
import { useToast } from '../components/Toast';
import Toolbar from '../components/Toolbar';
import { palette, fonts, radii, shadows, spacing, typography } from '../theme';

const COLORS = ['#282522', '#C9913B', '#B3261E', '#1E6B3A', '#1B5BA6', '#6B1B8F', '#817A73', '#F3D27A'];

const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const TOOLBAR_FORMATS = ['bold', 'italic', 'underline', 'strike', 'h2', 'ul', 'ol', 'quote'];

function formatBytes(n) {
  if (!Number.isFinite(Number(n)) || n <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u += 1;
  }
  return `${v.toFixed(v >= 10 || u === 0 ? 0 : 1)} ${units[u]}`;
}

export default function ComposeScreen({ route }) {
  const navigation = useNavigation();
  const toast = useToast();

  const draftIdParam = route.params?.draftId;
  const templateIdParam = route.params?.templateId;

  const editorRef = useRef(null);
  const codeRef = useRef(null);

  const [template, setTemplate] = useState(null);
  const [body, setBody] = useState('');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState([]);
  const [bcc, setBcc] = useState([]);
  const [subject, setSubject] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [view, setView] = useState('write');
  const [states, setStates] = useState({});

  const [draftActive, setDraftActive] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [ccbccOpen, setCcbccOpen] = useState(false);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [pickedAccountId, setPickedAccountId] = useState(null);

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [colorOpen, setColorOpen] = useState(false);

  const loadedRef = useRef(false);
  const dirtyRef = useRef(false);
  const latestRef = useRef({ to: '', cc: [], bcc: [], subject: '', body: '', attachments: [] });
  const saveTimer = useRef(null);
  const draftIdRef = useRef(null);
  const templateRef = useRef(null);

  useEffect(() => {
    latestRef.current = { to, cc, bcc, subject, body, attachments };
  }, [to, cc, bcc, subject, body, attachments]);

  useEffect(() => {
    templateRef.current = template;
  }, [template]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [accountList, defId] = await Promise.all([getSmtpAccounts(), getDefaultSmtpId()]);
      if (!mounted) return;
      const configured = accountList.filter(smtpIsConfigured);
      setAccounts(configured);
      setPickedAccountId(defId && configured.some((a) => a.id === defId) ? defId : (configured[0]?.id || null));
      let restoredDraft = null;
      if (draftIdParam) {
        restoredDraft = await getDraft(draftIdParam);
      }

      if (restoredDraft && restoredDraft.id) {
        draftIdRef.current = restoredDraft.id;
        setTo(restoredDraft.to || '');
        setCc(Array.isArray(restoredDraft.cc) ? restoredDraft.cc : []);
        setBcc(Array.isArray(restoredDraft.bcc) ? restoredDraft.bcc : []);
        setSubject(restoredDraft.subject || '');
        setBody(restoredDraft.bodyHtml || '');
        setAttachments(
          Array.isArray(restoredDraft.attachments) ? restoredDraft.attachments.filter((a) => a && a.uri) : []
        );
        const t =
          (restoredDraft.templateId && (await getTemplateById(restoredDraft.templateId))) ||
          (await resolveDefaultTemplate());
        setTemplate(t);
        setDraftActive(true);
        toast({ type: 'info', message: 'Draft restored. Keep editing?' });
      } else {
        const t =
          (templateIdParam && (await getTemplateById(templateIdParam))) ||
          (await resolveDefaultTemplate());
        setTemplate(t);
        setBody((t && t.bodyHtml) || '');
      }
      loadedRef.current = true;
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [templateIdParam, draftIdParam, toast]);

  const persistDraft = useCallback((withId) => {
    const latest = latestRef.current;
    const payload = {
      id: draftIdRef.current || undefined,
      templateId: templateRef.current?.id,
      to: latest.to,
      cc: latest.cc,
      bcc: latest.bcc,
      subject: latest.subject,
      bodyHtml: latest.body,
      attachments: latest.attachments.map((a) => ({
        id: a.id,
        name: a.name,
        uri: a.uri,
        size: a.size,
        mimeType: a.mimeType,
      })),
    };
    if (withId && !latest.body && !latest.subject && !latest.to) return;
    saveDraft(payload).then((saved) => {
      if (saved && saved.id) {
        draftIdRef.current = saved.id;
        setDraftActive(true);
      }
    });
  }, []);

  const scheduleSave = useCallback(() => {
    if (!loadedRef.current || !dirtyRef.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistDraft(true), 800);
  }, [persistDraft]);

  useEffect(() => {
    return () => clearTimeout(saveTimer.current);
  }, []);

  const markDirty = useCallback(() => {
    if (!loadedRef.current) return;
    dirtyRef.current = true;
    setDraftActive(true);
    scheduleSave();
  }, [scheduleSave]);

  const handleToolbar = useCallback(
    (action) => {
      const e = editorRef.current;
      if (!e) return;
      if (TOOLBAR_FORMATS.includes(action)) {
        setStates((p) => ({ ...p, [action]: !p[action] }));
      }
      switch (action) {
        case 'bold': e.runCommand('bold'); break;
        case 'italic': e.runCommand('italic'); break;
        case 'underline': e.runCommand('underline'); break;
        case 'strike': e.runCommand('strikeThrough'); break;
        case 'h2': e.runCommand('formatBlock', '<h2>'); break;
        case 'ul': e.runCommand('insertUnorderedList'); break;
        case 'ol': e.runCommand('insertOrderedList'); break;
        case 'quote': e.runCommand('formatBlock', '<blockquote>'); break;
        case 'undo': e.undo(); break;
        case 'clear': e.runCommand('removeFormat'); break;
        case 'link': setLinkUrl(''); setLinkOpen(true); break;
        case 'color': setColorOpen(true); break;
        default: break;
      }
    },
    []
  );

  const applyTemplate = (t) => {
    setTemplate(t);
    setBody(t.bodyHtml);
    editorRef.current?.setHtml(t.bodyHtml);
    codeRef.current?.setValue(t.bodyHtml);
    setLibraryOpen(false);
    markDirty();
  };

  const pickAttachments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const picked = (result.assets || []).map((a) => ({
        id: `a${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
        name: a.name || 'file',
        uri: a.uri,
        size: Number(a.size) || 0,
        mimeType: a.mimeType || '',
      }));
      if (!picked.length) return;
      setAttachments((prev) => [...prev, ...picked].slice(0, 12));
      markDirty();
    } catch (e) {
      toast({ type: 'error', message: e.message || 'Could not open file picker.' });
    }
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    markDirty();
  };

  const confirmLink = () => {
    const raw = linkUrl.trim();
    if (!raw) {
      setLinkOpen(false);
      return;
    }
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    editorRef.current?.runCommand('createLink', url);
    setLinkOpen(false);
  };

  const confirmColor = (color) => {
    editorRef.current?.setColor(color);
    setColorOpen(false);
  };

  const sendWithAccount = async (smtp) => {
    if (!smtpIsConfigured(smtp)) {
      toast({ type: 'error', message: 'Configure SMTP in Settings before sending.' });
      navigation.navigate('Settings');
      return;
    }
    if (smtp.id) await setDefaultSmtpId(smtp.id);
    setSending(true);
    try {
      const allRecipients = [
        ...to.split(',').map((s) => s.trim()).filter(Boolean),
        ...cc,
        ...bcc,
      ];
      const html = buildEmailHtml(contentForSend());
      const mail = {
        to: to.trim(),
        cc,
        bcc,
        subject,
        html,
        attachments,
      };
      await smtpSendEmail(mail, smtp);
      if (draftIdRef.current) await deleteDraft(draftIdRef.current);
      await setLastDraftId(null);
      setDraftActive(false);
      await addSentEmail({
        to: allRecipients.join(', '),
        subject,
        fromName: smtp.fromName,
        fromEmail: smtp.fromEmail,
        html,
        attachments,
      });
      toast({ type: 'success', message: 'Email sent successfully.' });
      navigation.goBack();
    } catch (e) {
      toast({ type: 'error', message: e.message });
    } finally {
      setSending(false);
    }
  };

  const contentForSend = () => {
    const content = body && body.trim();
    return content && content !== '<br>' && !/^<(\w+)>\s*<\/\1>$/.test(content) ? content : '';
  };

  const handleSend = () => {
    const allRecipients = [...to.split(',').map((s) => s.trim()).filter(Boolean), ...cc, ...bcc];
    if (allRecipients.length === 0 || !allRecipients.every(isValidEmail)) {
      toast({ type: 'error', message: 'Please enter a valid recipient email.' });
      return;
    }
    if (!subject.trim()) {
      toast({ type: 'error', message: 'Please enter a subject line.' });
      return;
    }
    if (!contentForSend()) {
      toast({ type: 'error', message: 'The email body is empty.' });
      return;
    }
    if (accounts.length === 0) {
      toast({ type: 'error', message: 'Configure SMTP in Settings before sending.' });
      navigation.navigate('Settings');
      return;
    }
    if (accounts.length === 1) {
      sendWithAccount(accounts[0]);
      return;
    }
    setAccountPickerOpen(true);
  };

  const confirmSendAccount = async () => {
    const account = accounts.find((a) => a.id === pickedAccountId);
    if (!account) {
      toast({ type: 'error', message: 'Select an account to send from.' });
      return;
    }
    setAccountPickerOpen(false);
    await sendWithAccount(account);
  };

  const saveNow = () => {
    clearTimeout(saveTimer.current);
    const latest = latestRef.current;
    if (!latest.body && !latest.subject && !latest.to) {
      toast({ type: 'info', message: 'Nothing to save yet — write something first.' });
      return;
    }
    persistDraft(true);
    setDraftActive(true);
    toast({ type: 'success', message: 'Draft saved.' });
  };

  const flushAndClose = () => {
    clearTimeout(saveTimer.current);
    if (loadedRef.current && dirtyRef.current) {
      saveDraft({
        id: draftIdRef.current || undefined,
        templateId: templateRef.current?.id,
        to: latestRef.current.to,
        cc: latestRef.current.cc,
        bcc: latestRef.current.bcc,
        subject: latestRef.current.subject,
        bodyHtml: latestRef.current.body,
        attachments: latestRef.current.attachments
          .map((a) => ({ id: a.id, name: a.name, uri: a.uri, size: a.size, mimeType: a.mimeType })),
      }).then((saved) => {
        if (saved && saved.id) draftIdRef.current = saved.id;
      });
    }
    if (navigation.canGoBack()) navigation.goBack();
  };

  const handleReset = async () => {
    setTo('');
    setCc([]);
    setBcc([]);
    setSubject('');
    setBody('');
    setAttachments([]);
    editorRef.current?.setHtml('');
    codeRef.current?.setValue('');
    dirtyRef.current = false;
    if (draftIdRef.current) await deleteDraft(draftIdRef.current);
    draftIdRef.current = null;
    await setLastDraftId(null);
    setDraftActive(false);
    setResetOpen(false);
    toast({ type: 'info', message: 'Fields cleared and draft removed.' });
  };

  const close = flushAndClose;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={close} hitSlop={10} style={styles.closeBtn}>
            <MaterialIcons name="keyboard-arrow-down" size={26} color={palette.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>Compose</Text>
          <Pressable
            onPress={handleSend}
            disabled={sending}
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="send" size={15} color="#FFFFFF" />
                <Text style={styles.sendText}>Send</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Controls card */}
        <View style={styles.controlsCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>To</Text>
            <TextInput
              style={styles.metaInput}
              value={to}
              onChangeText={(v) => {
                setTo(v);
                markDirty();
              }}
              placeholder="email@example.com"
              placeholderTextColor={palette.muted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.metaToggles}>
              <Pressable
                onPress={() => setCcbccOpen(true)}
                style={[styles.metaToggle, (cc.length || bcc.length) && styles.metaToggleOn]}
                hitSlop={4}
              >
                <Text style={[styles.metaToggleText, (cc.length || bcc.length) && styles.metaToggleTextOn]}>
                  {cc.length || bcc.length ? `Cc/Bcc (${cc.length + bcc.length})` : 'Cc/Bcc'}
                </Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.hairline} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Subject</Text>
            <TextInput
              style={styles.metaInput}
              value={subject}
              onChangeText={(v) => {
                setSubject(v);
                markDirty();
              }}
              placeholder="Subject line"
              placeholderTextColor={palette.muted}
            />
          </View>
          <View style={styles.hairline} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>From</Text>
            <Pressable
              style={styles.fromPicker}
              onPress={() => {
                if (accounts.length > 1) setAccountPickerOpen(true);
              }}
              disabled={accounts.length <= 1}
            >
              <MaterialIcons name="person" size={15} color={palette.info} />
              <Text style={styles.fromPickerText} numberOfLines={1}>
                {accounts.length === 0
                  ? 'No account — open Settings'
                  : (accounts.find((a) => a.id === pickedAccountId)?.name ||
                     accounts.find((a) => a.id === pickedAccountId)?.fromEmail ||
                     'Select account')}
              </Text>
              {accounts.length > 1 && <MaterialIcons name="unfold-more" size={15} color={palette.mutedStrong} />}
            </Pressable>
          </View>
          <View style={styles.hairline} />
          <Toolbar onAction={handleToolbar} states={states} />
          {attachments.length > 0 && (
            <>
              <View style={styles.hairline} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.attachList}
                keyboardShouldPersistTaps="handled"
              >
                {attachments.map((a) => (
                  <View key={a.id} style={styles.attachChip}>
                    <MaterialIcons name="attach-file" size={16} color={palette.info} />
                    <View style={styles.flexOne}>
                      <Text style={styles.attachName} numberOfLines={1}>{a.name}</Text>
                      {a.size ? <Text style={styles.attachSize}>{formatBytes(a.size)}</Text> : null}
                    </View>
                    <Pressable onPress={() => removeAttachment(a.id)} hitSlop={8}>
                      <MaterialIcons name="close" size={15} color={palette.mutedStrong} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </>
          )}
          <View style={styles.hairline} />
          <View style={styles.utilRow}>
            <Pressable style={styles.tplChip} onPress={() => setLibraryOpen(true)} hitSlop={4}>
              <MaterialIcons name="description" size={15} color={palette.ink} />
              <Text style={styles.tplChipText} numberOfLines={1}>
                {template?.name || 'Template'}
              </Text>
              <MaterialIcons name="unfold-more" size={15} color={palette.mutedStrong} />
            </Pressable>
            <View style={styles.flexOne} />
            <Pressable onPress={pickAttachments} hitSlop={6} style={styles.actionPill}>
              <MaterialIcons name="attach-file" size={16} color={palette.info} />
              <Text style={styles.actionPillText}>Add files</Text>
            </Pressable>
            <Pressable onPress={saveNow} hitSlop={6} style={styles.actionPill}>
              <MaterialIcons
                name="drafts"
                size={16}
                color={draftActive ? palette.info : palette.muted}
              />
              <Text style={[styles.actionPillText, draftActive && styles.actionPillTextActive]}>
                {draftActive ? 'Draft' : 'Save'}
              </Text>
            </Pressable>
            <Pressable onPress={() => setResetOpen(true)} hitSlop={6} style={styles.actionPill}>
              <MaterialIcons name="delete-sweep" size={16} color={palette.mutedStrong} />
              <Text style={styles.actionPillText}>Clear</Text>
            </Pressable>
          </View>
        </View>

        {/* Editor / Preview */}
        <View style={styles.viewSwitch}>
          <Pressable
            style={[styles.viewSwitchItem, view === 'write' && styles.viewSwitchActive]}
            onPress={() => setView('write')}
          >
            <Text style={[styles.viewSwitchText, view === 'write' && styles.viewSwitchTextActive]}>
              Write
            </Text>
          </Pressable>
          <Pressable
            style={[styles.viewSwitchItem, view === 'code' && styles.viewSwitchActive]}
            onPress={() => setView('code')}
          >
            <Text style={[styles.viewSwitchText, view === 'code' && styles.viewSwitchTextActive]}>
              Code
            </Text>
          </Pressable>
          <Pressable
            style={[styles.viewSwitchItem, view === 'preview' && styles.viewSwitchActive]}
            onPress={() => setView('preview')}
          >
            <Text style={[styles.viewSwitchText, view === 'preview' && styles.viewSwitchTextActive]}>
              Preview
            </Text>
          </Pressable>
        </View>

        {view === 'preview' ? (
          <View style={styles.editorWrap}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={palette.info} />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.previewHint}>Preview — exactly what the recipient sees</Text>
                <WebView
                  style={styles.preview}
                  originWhitelist={['*']}
                  source={{ html: buildEmailHtml(body) }}
                  showsVerticalScrollIndicator={false}
                />
              </>
            )}
          </View>
        ) : view === 'code' ? (
          <View style={styles.editorWrap}>
            <Text style={styles.previewHint}>Full HTML — paste anything, tags included</Text>
            <CodeEditor
              ref={codeRef}
              style={styles.codeInput}
              initialValue={body}
              onChange={(t) => {
                setBody(t);
                markDirty();
              }}
            />
          </View>
        ) : (
          <View style={styles.editorWrap}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={palette.info} />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : (
              <RichEditor
                ref={editorRef}
                initialBody={body}
                onContentChange={(t) => {
                  setBody(t);
                  markDirty();
                }}
                onStateChange={setStates}
                style={styles.editor}
              />
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Template library */}
      <TemplateLibrary
        visible={libraryOpen}
        selectedId={template?.id}
        onClose={() => setLibraryOpen(false)}
        onSelect={applyTemplate}
      />

      {/* CC/BCC modal */}
      <CcBccModal
        visible={ccbccOpen}
        cc={cc}
        bcc={bcc}
        onChange={(nextCc, nextBcc) => {
          setCc(nextCc);
          setBcc(nextBcc);
          markDirty();
        }}
        onClose={() => setCcbccOpen(false)}
      />

      {/* Account picker */}
      <AccountPickerModal
        visible={accountPickerOpen}
        accounts={accounts}
        selectedId={pickedAccountId}
        onSelect={setPickedAccountId}
        onConfirm={confirmSendAccount}
        onClose={() => setAccountPickerOpen(false)}
      />

      {/* Reset confirm */}
      <Modal visible={resetOpen} transparent animationType="fade" onRequestClose={() => setResetOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Clear letter?</Text>
            <Text style={styles.modalBody}>
              This clears the letter, fields, attachments, and removes the saved draft. This cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setResetOpen(false)}>
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnDanger]} onPress={handleReset}>
                <Text style={styles.modalBtnDangerText}>Clear</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Link modal */}
      <Modal visible={linkOpen} transparent animationType="fade" onRequestClose={() => setLinkOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add link</Text>
            <TextInput
              style={styles.modalInput}
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="https://example.com"
              placeholderTextColor={palette.muted}
              autoCapitalize="none"
              autoFocus
              onSubmitEditing={confirmLink}
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setLinkOpen(false)}>
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={confirmLink}>
                <Text style={styles.modalBtnPrimaryText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Color modal */}
      <Modal visible={colorOpen} transparent animationType="fade" onRequestClose={() => setColorOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Text color</Text>
            <View style={styles.swatches}>
              {COLORS.map((c) => (
                <Pressable
                  key={c}
                  style={styles.swatch}
                  onPress={() => confirmColor(c)}
                >
                  <Text style={{ color: c }}>A</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  flexOne: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: 8,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.subtitle, fontSize: 16 },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: palette.ink,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(4),
    paddingVertical: 7,
    minWidth: 64,
    justifyContent: 'center',
    ...shadows.soft,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 14 },
  controlsCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    marginHorizontal: spacing(3),
    marginBottom: spacing(2),
    overflow: 'hidden',
    ...shadows.soft,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(4),
    minHeight: 44,
  },
  metaLabel: {
    width: 52,
    ...typography.caption,
    color: palette.mutedStrong,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  metaInput: { flex: 1, fontSize: 15, color: palette.ink, paddingVertical: 8, fontFamily: fonts.regular },
  metaToggles: { flexDirection: 'row', gap: spacing(2) },
  metaToggle: {
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: 4,
    backgroundColor: palette.surfaceAlt,
  },
  metaToggleOn: { backgroundColor: palette.ink, borderColor: palette.ink },
  metaToggleText: { fontFamily: fonts.semibold, fontSize: 11, color: palette.mutedStrong },
  metaToggleTextOn: { color: '#FFFFFF' },
  fromPicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  fromPickerText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: palette.ink,
  },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: palette.hairline, marginLeft: spacing(4) },
  attachList: {
    alignItems: 'center',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    gap: spacing(2),
  },
  attachChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 240,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: 6,
  },
  attachName: { fontFamily: fonts.semibold, fontSize: 12, color: palette.ink, maxWidth: 140 },
  attachSize: { ...typography.caption, fontSize: 10 },
  utilRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    gap: spacing(2),
  },
  tplChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
    maxWidth: 130,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: 6,
  },
  tplChipText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: palette.ink,
    flexShrink: 1,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: 6,
    backgroundColor: palette.surfaceAlt,
  },
  actionPillText: { fontFamily: fonts.semibold, fontSize: 11, color: palette.mutedStrong },
  actionPillTextActive: { color: palette.info },
  viewSwitch: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: spacing(2),
    marginBottom: spacing(2),
    backgroundColor: palette.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    padding: 2,
    ...shadows.soft,
  },
  viewSwitchItem: {
    paddingHorizontal: spacing(5),
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  viewSwitchActive: { backgroundColor: palette.ink },
  viewSwitchText: { fontFamily: fonts.semibold, fontSize: 13, color: palette.mutedStrong },
  viewSwitchTextActive: { color: '#FFFFFF' },
  editorWrap: { flex: 1, backgroundColor: palette.bg },
  editor: { flex: 1, backgroundColor: palette.bg },
  previewHint: { ...typography.caption, textAlign: 'center', paddingTop: spacing(2), paddingBottom: spacing(1) },
  preview: { flex: 1, backgroundColor: palette.bg },
  codeInput: {
    flex: 1,
    marginHorizontal: spacing(3),
    marginBottom: spacing(3),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#3C3C3C',
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },
  loadingText: { ...typography.caption, marginTop: spacing(3) },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(40,37,34,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(6),
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    padding: spacing(5),
    ...shadows.card,
  },
  modalTitle: { ...typography.subtitle, marginBottom: spacing(3) },
  modalBody: { ...typography.body, color: palette.mutedStrong, marginBottom: spacing(4) },
  modalInput: {
    borderWidth: 1,
    borderColor: palette.cardBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing(4),
    paddingVertical: 12,
    fontSize: 15,
    color: palette.ink,
    backgroundColor: palette.bgSoft,
    fontFamily: fonts.regular,
    marginBottom: spacing(4),
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing(3) },
  modalBtn: {
    paddingHorizontal: spacing(4),
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  modalBtnGhost: { borderWidth: 1, borderColor: palette.hairline },
  modalBtnGhostText: { color: palette.mutedStrong, fontFamily: fonts.semibold },
  modalBtnPrimary: { backgroundColor: palette.ink },
  modalBtnPrimaryText: { color: '#FFFFFF', fontFamily: fonts.bold },
  modalBtnDanger: { backgroundColor: palette.error },
  modalBtnDangerText: { color: '#FFFFFF', fontFamily: fonts.bold },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.cardBorder,
  },
});