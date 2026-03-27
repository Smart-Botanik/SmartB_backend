import { Module } from "@nestjs/common";
import { DiaryResolver } from "./diary.resolver";
import { DiaryService } from "./diary.service";

@Module({
  providers: [DiaryResolver, DiaryService],
  exports: [DiaryService],
})
export class DiaryModule {}
