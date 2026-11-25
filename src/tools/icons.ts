import {
  Activity, AlignLeft, ArrowDownUp, ArrowLeftRight, Award, Barcode, Battery, BatteryCharging, Binary, Blend,
  BookOpen, Box, Braces, Brain, Cake, CalendarClock, CalendarDays, CalendarRange, Calculator, CaseLower,
  CaseSensitive, CaseUpper, CircuitBoard, Clock, Code, Compass, Contact, Cpu, Crop, Dices, Diff, Divide,
  Eraser, FileCode, FileImage, FileType, Fingerprint, Flashlight, GraduationCap, Globe, Hash, HardDrive,
  Hourglass, Image, ImageDown, KeyRound, Landmark, Layers, LayoutGrid, Link, ListX, Lock, MemoryStick, Merge,
  Minimize2, Monitor, Network, Palette, Percent, Phone, Pipette, PiggyBank, QrCode, Radio, Receipt, Regex,
  Repeat, RotateCw, Route, Ruler, Scale, Scaling, ScanLine, Search, Server, Shield, ShieldCheck, Signal, Sigma,
  Smartphone, Smile, Sparkles, Split, Tag, Text, Thermometer, Timer, TrendingDown, TrendingUp, Type, Unlink,
  Unlock, Users, Vibrate, Wallet, Weight, Wifi, Wrench, type LucideIcon,
} from 'lucide-react';

// Hanya icon yang dipakai registry yang di-import (tree-shaking). Tambah di sini bila menambah tool baru.
const ICONS: Record<string, LucideIcon> = {
  Activity, AlignLeft, ArrowDownUp, ArrowLeftRight, Award, Barcode, Battery, BatteryCharging, Binary, Blend,
  BookOpen, Box, Braces, Brain, Cake, CalendarClock, CalendarDays, CalendarRange, Calculator, CaseLower,
  CaseSensitive, CaseUpper, CircuitBoard, Clock, Code, Compass, Contact, Cpu, Crop, Dices, Diff, Divide,
  Eraser, FileCode, FileImage, FileType, Fingerprint, Flashlight, GraduationCap, Globe, Hash, HardDrive,
  Hourglass, Image, ImageDown, KeyRound, Landmark, Layers, LayoutGrid, Link, ListX, Lock, MemoryStick, Merge,
  Minimize2, Monitor, Network, Palette, Percent, Phone, Pipette, PiggyBank, QrCode, Radio, Receipt, Regex,
  Repeat, RotateCw, Route, Ruler, Scale, Scaling, ScanLine, Search, Server, Shield, ShieldCheck, Signal, Sigma,
  Smartphone, Smile, Sparkles, Split, Tag, Text, Thermometer, Timer, TrendingDown, TrendingUp, Type, Unlink,
  Unlock, Users, Vibrate, Wallet, Weight, Wifi, Wrench,
};

export function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? Wrench;
}
